import net from "node:net";
import Redis from "ioredis";
import { writeOutcome } from "../lib/callback-outcome";

type AmiListenerConfig = {
  host: string;
  port: number;
  username: string;
  password: string;

  // Keepalive
  pingIntervalMs: number;

  // Optional safety: if we never map a jobId, we still log events (no-op)
  debug: boolean;
};

type AmiPacket = {
  type: "response" | "event" | "unknown";
  headers: Record<string, string>;
  raw: string;
};

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function envInt(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? Number(v) : fallback;
  return Number.isFinite(n) ? n : fallback;
}
function envBool(name: string, fallback: boolean) {
  const v = process.env[name];
  if (!v) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(v.toLowerCase());
}

function parseBlocks(buffer: string) {
  // AMI packets end with \r\n\r\n
  const parts = buffer.split("\r\n\r\n");
  const complete = parts.slice(0, -1); // last is maybe incomplete
  const remainder = parts[parts.length - 1] ?? "";
  return { complete, remainder };
}

function parseBlock(block: string): AmiPacket {
  const headers: Record<string, string> = {};
  for (const line of block.split("\r\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      headers[k] = v;
    }
  }
  const type =
    headers["Event"] ? "event" :
    headers["Response"] ? "response" :
    "unknown";

  return { type, headers, raw: block };
}

function nowIso() {
  return new Date().toISOString();
}

function safeUpper(v?: string) {
  return (v || "").toUpperCase();
}

function normalizeCause(headers: Record<string, string>) {
  // Hangup typically has Cause / Cause-txt
  return {
    hangup_cause: headers["Cause"] || "",
    hangup_cause_txt: headers["Cause-txt"] || headers["CauseTxt"] || "",
  };
}

/**
 * AMI Event Listener v1
 *
 * Correlation strategy (v1):
 * - We rely on Originate setting Variable: CALLBACK_JOB_ID=...
 * - We listen for VarSet events: Variable=CALLBACK_JOB_ID -> Value=<jobId>
 * - We map (Uniqueid OR Linkedid) -> jobId for later Hangup/Dial/Bridge events
 *
 * Answer detection (v1):
 * - Prefer BridgeEnter (means bridged/answered)
 * - Also accept DialEnd with DialStatus=ANSWER
 *
 * Finalization (v1):
 * - Hangup event -> mark final=completed (if answered) else final=failed
 */
export class AmiEventListener {
  private cfg: AmiListenerConfig;
  private socket: net.Socket | null = null;
  private buffer = "";
  private pingTimer: NodeJS.Timeout | null = null;

  private redis: Redis;

  // Maps for correlating events to callback jobId
  private uniqueIdToJobId = new Map<string, string>();
  private linkedIdToJobId = new Map<string, string>();

  // Track answered state per job
  private jobAnswered = new Map<string, boolean>();

  constructor(cfg: AmiListenerConfig) {
    this.cfg = cfg;
    this.redis = new Redis(reqEnv("REDIS_URL"));
  }

  start() {
    this.connect();
  }

  stop() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    try { this.socket?.end(); } catch {}
    try { this.socket?.destroy(); } catch {}
    this.socket = null;
  }

  private log(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log("[ami-listener]", ...args);
  }

  private debug(...args: any[]) {
    if (!this.cfg.debug) return;
    // eslint-disable-next-line no-console
    console.log("[ami-listener:debug]", ...args);
  }

  private connect() {
    const socket = net.createConnection({ host: this.cfg.host, port: this.cfg.port });
    this.socket = socket;

    socket.on("connect", () => {
      this.log(`connected ${this.cfg.host}:${this.cfg.port}`);
      this.login();
      this.startPing();
    });

    socket.on("error", (err) => {
      this.log("socket error:", err?.message || err);
    });

    socket.on("close", () => {
      this.log("socket closed; reconnecting in 2s...");
      this.stopPing();
      this.socket = null;

      setTimeout(() => this.connect(), 2000);
    });

    socket.on("data", (data) => {
      this.buffer += data.toString("utf8");
      const { complete, remainder } = parseBlocks(this.buffer);
      this.buffer = remainder;

      for (const block of complete) {
        const pkt = parseBlock(block);
        if (pkt.type === "event") void this.handleEvent(pkt.headers);
        else if (pkt.type === "response") this.debug("response:", pkt.headers["Response"], pkt.headers["Message"]);
        else this.debug("unknown packet:", pkt.raw.slice(0, 120));
      }
    });
  }

  private send(lines: string[]) {
    if (!this.socket) return;
    const msg = [...lines, "", ""].join("\r\n");
    this.socket.write(msg);
  }

  private login() {
    this.send([
      "Action: Login",
      `Username: ${this.cfg.username}`,
      `Secret: ${this.cfg.password}`,
      "Events: on",
    ]);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send([
        "Action: Ping",
        `ActionID: ping-${Date.now()}`,
      ]);
    }, this.cfg.pingIntervalMs);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private async bindJob(jobId: string, uniqueid?: string, linkedid?: string) {
    if (uniqueid) this.uniqueIdToJobId.set(uniqueid, jobId);
    if (linkedid) this.linkedIdToJobId.set(linkedid, jobId);

    await writeOutcome(this.redis, jobId, {
      stage: "correlated",
      correlated_at: nowIso(),
      uniqueid: uniqueid || "",
      linkedid: linkedid || "",
    });
  }

  private resolveJobId(headers: Record<string, string>): string | null {
    const uniqueid = headers["Uniqueid"] || headers["UniqueId"] || "";
    const linkedid = headers["Linkedid"] || headers["LinkedId"] || "";
    const channel = headers["Channel"] || "";

    // 1) direct maps
    if (uniqueid && this.uniqueIdToJobId.has(uniqueid)) return this.uniqueIdToJobId.get(uniqueid)!;
    if (linkedid && this.linkedIdToJobId.has(linkedid)) return this.linkedIdToJobId.get(linkedid)!;

    // 2) Sometimes events provide DestUniqueid / DestLinkedid (Dial)
    const destUnique = headers["DestUniqueid"] || headers["DestUniqueId"] || "";
    const destLinked = headers["DestLinkedid"] || headers["DestLinkedId"] || "";
    if (destUnique && this.uniqueIdToJobId.has(destUnique)) return this.uniqueIdToJobId.get(destUnique)!;
    if (destLinked && this.linkedIdToJobId.has(destLinked)) return this.linkedIdToJobId.get(destLinked)!;

    // No correlation yet
    this.debug("unmapped event", headers["Event"], { uniqueid, linkedid, channel });
    return null;
  }

  private markAnswered(jobId: string, reason: string) {
    if (this.jobAnswered.get(jobId)) return; // already answered
    this.jobAnswered.set(jobId, true);
    return writeOutcome(this.redis, jobId, {
      stage: "answered",
      answered_at: nowIso(),
      answered_reason: reason,
    });
  }

  private async finalize(jobId: string, ok: boolean, reason: string, extra?: Record<string, string>) {
    const answered = !!this.jobAnswered.get(jobId);
    const final = ok ? "completed" : "failed";

    await writeOutcome(this.redis, jobId, {
      stage: "hangup",
      final,
      final_reason: reason,
      answered: answered ? "true" : "false",
      ...extra,
    });
  }

  private async handleEvent(h: Record<string, string>) {
    const ev = h["Event"] || "";

    // 1) Correlate VarSet CALLBACK_JOB_ID
    if (ev === "VarSet") {
      const variable = h["Variable"] || "";
      const value = h["Value"] || "";

      if (variable === "CALLBACK_JOB_ID" && value) {
        const uniqueid = h["Uniqueid"] || h["UniqueId"] || "";
        const linkedid = h["Linkedid"] || h["LinkedId"] || "";

        this.debug("VarSet CALLBACK_JOB_ID", { value, uniqueid, linkedid });
        await this.bindJob(value, uniqueid, linkedid);
        return;
      }
    }

    // 2) Mark answered (BridgeEnter is strong signal)
    if (ev === "BridgeEnter") {
      const jobId = this.resolveJobId(h);
      if (!jobId) return;

      await this.markAnswered(jobId, "BridgeEnter");
      await writeOutcome(this.redis, jobId, {
        stage: "bridged",
        bridged_at: nowIso(),
        bridge_uniqueid: h["BridgeUniqueid"] || "",
        channel: h["Channel"] || "",
      });
      return;
    }

    // 3) DialEnd can also indicate answered
    if (ev === "DialEnd") {
      const jobId = this.resolveJobId(h);
      if (!jobId) return;

      const dialStatus = safeUpper(h["DialStatus"]);
      if (dialStatus === "ANSWER") {
        await this.markAnswered(jobId, "DialEnd:ANSWER");
      }

      await writeOutcome(this.redis, jobId, {
        stage: "dial",
        dial_status: dialStatus,
        dial_end_at: nowIso(),
        dest_channel: h["DestChannel"] || "",
      });
      return;
    }

    // 4) Hangup finalizes
    if (ev === "Hangup") {
      const jobId = this.resolveJobId(h);
      if (!jobId) return;

      const { hangup_cause, hangup_cause_txt } = normalizeCause(h);
      const answered = !!this.jobAnswered.get(jobId);

      // v1 heuristic:
      // - if answered -> completed
      // - if not answered -> failed
      const ok = answered;

      await this.finalize(
        jobId,
        ok,
        hangup_cause_txt || hangup_cause || "Hangup",
        {
          hangup_at: nowIso(),
          hangup_cause,
          hangup_cause_txt,
          channel: h["Channel"] || "",
        }
      );

      // cleanup maps (best-effort)
      const uniqueid = h["Uniqueid"] || h["UniqueId"] || "";
      const linkedid = h["Linkedid"] || h["LinkedId"] || "";
      if (uniqueid) this.uniqueIdToJobId.delete(uniqueid);
      if (linkedid) this.linkedIdToJobId.delete(linkedid);

      return;
    }

    // optional: log other events for debugging
    if (this.cfg.debug && (ev === "Newchannel" || ev === "Newstate" || ev === "DialBegin" || ev === "BridgeCreate")) {
      const jobId = this.resolveJobId(h);
      this.debug("event", ev, { jobId, uniqueid: h["Uniqueid"], linkedid: h["Linkedid"] });
    }
  }
}

export function startAmiEventListener() {
  const listener = new AmiEventListener({
    host: reqEnv("ASTERISK_AMI_HOST"),
    port: envInt("ASTERISK_AMI_PORT", 5038),
    username: reqEnv("ASTERISK_AMI_USER"),
    password: reqEnv("ASTERISK_AMI_PASS"),
    pingIntervalMs: envInt("ASTERISK_AMI_PING_INTERVAL_MS", 15000),
    debug: envBool("ASTERISK_AMI_DEBUG", false),
  });

  listener.start();

  // Keep process healthy on SIGTERM
  process.on("SIGTERM", async () => {
    listener.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    listener.stop();
    process.exit(0);
  });

  return listener;
}
