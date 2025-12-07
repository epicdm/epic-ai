/**
 * Magnus Billing API Client
 * Port from Python reference code in /opt/epic-ai/livekit1/magnus_billing_client.py
 *
 * Magnus Billing is used for:
 * - DID (phone number) management
 * - SIP account management
 * - Inbound/outbound call routing
 */

// Lazy initialization to prevent build errors when env vars are not set
let magnusConfig: {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
} | null = null;

function getMagnusConfig() {
  if (!magnusConfig) {
    const apiKey = process.env.MAGNUS_API_KEY;
    const secretKey = process.env.MAGNUS_SECRET_KEY;
    const baseUrl = process.env.MAGNUS_BASE_URL;

    if (!apiKey || !secretKey || !baseUrl) {
      return null;
    }

    magnusConfig = {
      apiKey,
      secretKey,
      baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    };
  }
  return magnusConfig;
}

/**
 * Check if Magnus Billing is configured
 */
export function isMagnusConfigured(): boolean {
  return getMagnusConfig() !== null;
}

interface MagnusResponse {
  success?: boolean;
  rows?: Record<string, unknown>[];
  id?: string;
  error?: string;
  data?: string;
}

interface MagnusUser {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  mobile?: string;
  active: number;
  id_group: number;
  id_plan: number;
  typepaid: number;
  description?: string;
}

interface MagnusDID {
  id: string;
  did: string;
  country: string;
  activated: number;
  id_user?: string;
}

interface MagnusSIP {
  id: string;
  id_user: string;
  name: string;
  callerid?: string;
  voicemail?: number;
  voicemail_email?: string;
  voicemail_password?: string;
  allow?: string;
}

interface DIDDestination {
  id_user: string;
  id_did: string;
  voip_call: number;
  id_sip: string;
  destination: string;
  priority: number;
}

/**
 * Make API request to Magnus Billing
 */
async function makeRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  data?: Record<string, unknown>
): Promise<MagnusResponse> {
  const config = getMagnusConfig();
  if (!config) {
    return { success: false, error: "Magnus Billing not configured" };
  }

  const url = `${config.baseUrl}/index.php/api/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${config.apiKey}:${config.secretKey}`,
    "User-Agent": "Epic-AI Magnus Client",
  };

  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (method === "GET" && data) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${url}?${params.toString()}`;
      const response = await fetch(urlWithParams, options);
      return handleResponse(response);
    } else if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return handleResponse(response);
  } catch (error) {
    console.error("Magnus Billing API Error:", error);
    return { success: false, error: String(error) };
  }
}

async function handleResponse(response: Response): Promise<MagnusResponse> {
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  try {
    return await response.json();
  } catch {
    // Handle non-JSON responses
    const text = await response.text();
    return { success: true, data: text };
  }
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Create a new user in Magnus Billing
 */
export async function createUser(userData: {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  mobile?: string;
  id_plan?: number;
  id_group?: number;
  typepaid?: number;
  prefix_local?: string;
  id_offer?: number;
  description?: string;
}): Promise<MagnusResponse> {
  const data = {
    active: 1,
    id_plan: 34,
    id_group: 3,
    typepaid: 0,
    prefix_local: "*/1767/7,767/1767/10",
    description: "Epic-AI Customer",
    ...userData,
  };

  return makeRequest("POST", "user", data);
}

/**
 * Get user by username
 */
export async function getUser(username: string): Promise<MagnusUser | null> {
  const response = await makeRequest("GET", `user?filter[username]=${username}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusUser;
  }
  return null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<MagnusUser | null> {
  const response = await makeRequest("GET", `user/${userId}`);
  if (response.success !== false) {
    return response as unknown as MagnusUser;
  }
  return null;
}

/**
 * Update user information
 */
export async function updateUser(
  userId: string,
  updates: Partial<MagnusUser>
): Promise<MagnusResponse> {
  return makeRequest("PUT", `user/${userId}`, updates as Record<string, unknown>);
}

// ============================================================================
// DID (Phone Number) Management
// ============================================================================

/**
 * Generate a unique DID number in the specified range
 */
export async function generateUniqueDID(
  prefix: string = "1767818",
  minRange: number = 9000,
  maxRange: number = 9999,
  maxAttempts: number = 100
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomNumber = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
    const did = `${prefix}${randomNumber}`;

    // Check if DID exists
    const existing = await getDID(did);
    if (!existing) {
      return did;
    }
  }
  return null;
}

/**
 * Create DID in Magnus Billing
 */
export async function createDID(
  did: string,
  country: string = "Dominica",
  activated: number = 1
): Promise<MagnusResponse> {
  return makeRequest("POST", "did", {
    did,
    country,
    activated,
  });
}

/**
 * Get DID information by number
 */
export async function getDID(did: string): Promise<MagnusDID | null> {
  const response = await makeRequest("GET", `did?filter[did]=${did}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusDID;
  }
  return null;
}

/**
 * Get DID by ID
 */
export async function getDIDById(didId: string): Promise<MagnusDID | null> {
  const response = await makeRequest("GET", `did/${didId}`);
  if (response.success !== false) {
    return response as unknown as MagnusDID;
  }
  return null;
}

/**
 * List all DIDs
 */
export async function listDIDs(
  filters?: Record<string, string>
): Promise<MagnusDID[]> {
  let endpoint = "did";
  if (filters) {
    const params = Object.entries(filters)
      .map(([key, value]) => `filter[${key}]=${encodeURIComponent(value)}`)
      .join("&");
    endpoint = `did?${params}`;
  }

  const response = await makeRequest("GET", endpoint);
  if (response.rows) {
    return response.rows as unknown as MagnusDID[];
  }
  return [];
}

// ============================================================================
// DID Destination (Routing)
// ============================================================================

/**
 * Create DID destination (routing rules)
 */
export async function createDIDDestination(
  destinationData: DIDDestination
): Promise<MagnusResponse> {
  return makeRequest("POST", "diddestination", destinationData as unknown as Record<string, unknown>);
}

// ============================================================================
// SIP Management
// ============================================================================

/**
 * Get SIP account for user
 */
export async function getSIPByUser(userId: string): Promise<MagnusSIP | null> {
  const response = await makeRequest("GET", `sip?filter[id_user]=${userId}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusSIP;
  }
  return null;
}

/**
 * Update SIP account settings
 */
export async function updateSIP(
  sipId: string,
  updates: {
    callerid?: string;
    voicemail?: number;
    voicemail_email?: string;
    voicemail_password?: string;
    allow?: string;
  }
): Promise<MagnusResponse> {
  return makeRequest("PUT", `sip/${sipId}`, updates);
}

// ============================================================================
// Offer Management
// ============================================================================

/**
 * Create offer usage for user
 */
export async function createOfferUse(offerData: {
  id_user: string;
  id_offer: number;
  reservationdate: string;
  month_payed: number;
  status: number;
}): Promise<MagnusResponse> {
  return makeRequest("POST", "offeruse", offerData);
}

// ============================================================================
// Complete Provisioning Workflows
// ============================================================================

export interface ProvisionDIDResult {
  success: boolean;
  did?: string;
  didId?: string;
  sipId?: string;
  destination?: string;
  message?: string;
  error?: string;
}

/**
 * Provision a DID for an existing user with complete setup
 */
export async function provisionDIDForUser(
  userId: string,
  username: string,
  prefix: string = "1767818",
  minRange: number = 9000,
  maxRange: number = 9999
): Promise<ProvisionDIDResult> {
  try {
    // 1. Generate unique DID
    const did = await generateUniqueDID(prefix, minRange, maxRange);
    if (!did) {
      return {
        success: false,
        error: `No available DIDs in range ${prefix}${minRange}-${maxRange}`,
      };
    }

    console.log(`📞 Generated DID: ${did}`);

    // 2. Create DID in Magnus Billing
    const didResult = await createDID(did, "Dominica", 1);
    if (!didResult.success && !didResult.id) {
      return {
        success: false,
        error: `Failed to create DID: ${didResult.error || "Unknown error"}`,
      };
    }

    const didId = didResult.id;
    console.log(`✅ Created DID in Magnus, ID: ${didId}`);

    // 3. Get user's SIP account
    const sip = await getSIPByUser(userId);
    if (!sip) {
      return {
        success: false,
        error: `No SIP account found for user ${userId}`,
      };
    }

    const sipId = sip.id;
    console.log(`✅ Found SIP account, ID: ${sipId}`);

    // 4. Create DID destination (routing to SIP account)
    const destinationData: DIDDestination = {
      id_user: userId,
      id_did: didId!,
      voip_call: 1,
      id_sip: sipId,
      destination: `SIP/${username}`,
      priority: 1,
    };

    await createDIDDestination(destinationData);
    console.log(`✅ Created DID destination: SIP/${username}`);

    // 5. Set caller ID on SIP account
    await updateSIP(sipId, {
      callerid: did,
      allow: "opus,g729,gsm,alaw,ulaw",
    });
    console.log(`✅ Set caller ID: ${did}`);

    return {
      success: true,
      did,
      didId,
      sipId,
      destination: `SIP/${username}`,
      message: `DID ${did} provisioned and routed to ${username}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `DID provisioning failed: ${String(error)}`,
    };
  }
}

export interface ProvisionUserResult {
  success: boolean;
  userId?: string;
  username?: string;
  did?: string;
  password?: string;
  sipId?: string;
  email?: string;
  error?: string;
}

/**
 * Complete user provisioning workflow
 * Creates user, generates DID, creates SIP, sets up routing
 */
export async function provisionCompleteUser(
  firstname: string,
  lastname: string,
  email: string,
  phone: string,
  password?: string,
  prefix: string = "17678180"
): Promise<ProvisionUserResult> {
  try {
    // Generate password if not provided
    if (!password) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      password = Array.from({ length: 12 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
    }

    // Generate unique DID
    const did = await generateUniqueDID(prefix);
    if (!did) {
      return {
        success: false,
        error: "Could not generate unique DID",
      };
    }

    // Create username
    const safeFirstname = firstname.replace(/\s/g, "_").slice(0, 8);
    const username = `${safeFirstname}_${did}`;

    // Check if user exists
    const existingUser = await getUser(username);
    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
      };
    }

    // Create user
    const userResult = await createUser({
      username,
      password,
      firstname,
      lastname,
      email,
      phone,
      mobile: phone,
      id_group: 3,
      id_plan: 34,
      typepaid: 0,
      prefix_local: "*/1767/7,767/1767/10",
      description: "Epic-AI Customer",
      id_offer: 7,
    });

    if (!userResult.success && !userResult.id) {
      return {
        success: false,
        error: `User creation failed: ${userResult.error || "Unknown error"}`,
      };
    }

    const userId = userResult.id!;

    // Create DID
    const didResult = await createDID(did, "Dominica", 1);
    if (!didResult.success && !didResult.id) {
      return {
        success: false,
        error: `DID creation failed: ${didResult.error || "Unknown error"}`,
      };
    }

    const didId = didResult.id!;

    // Get SIP account
    const sip = await getSIPByUser(userId);
    if (!sip) {
      return {
        success: false,
        error: "SIP account not found",
      };
    }

    const sipId = sip.id;

    // Create DID destination
    await createDIDDestination({
      id_user: userId,
      id_did: didId,
      voip_call: 1,
      id_sip: sipId,
      destination: `SIP/${username}`,
      priority: 1,
    });

    // Update SIP settings
    await updateSIP(sipId, {
      callerid: did,
      voicemail: 1,
      voicemail_email: email,
      voicemail_password: did.slice(-4), // Last 4 digits of DID
      allow: "opus,g729,gsm,alaw,ulaw",
    });

    // Create offer use
    await createOfferUse({
      id_user: userId,
      id_offer: 7,
      reservationdate: new Date().toISOString().slice(0, 19).replace("T", " "),
      month_payed: 1,
      status: 1,
    });

    return {
      success: true,
      userId,
      username,
      did,
      password,
      sipId,
      email,
    };
  } catch (error) {
    return {
      success: false,
      error: `Provisioning failed: ${String(error)}`,
    };
  }
}

// ============================================================================
// CDR (Call Detail Records)
// ============================================================================

export interface CallDetailRecord {
  id: string;
  id_user: string;
  calledstation: string;
  src: string;
  starttime: string;
  sessiontime: number;
  sessionbill: number;
  real_sessiontime: number;
  terminatecauseid: number;
}

/**
 * Get call detail records
 */
export async function getCDRs(
  filters?: Record<string, string>,
  limit: number = 100
): Promise<CallDetailRecord[]> {
  let endpoint = `cdr?limit=${limit}`;
  if (filters) {
    const params = Object.entries(filters)
      .map(([key, value]) => `filter[${key}]=${encodeURIComponent(value)}`)
      .join("&");
    endpoint = `${endpoint}&${params}`;
  }

  const response = await makeRequest("GET", endpoint);
  if (response.rows) {
    return response.rows as unknown as CallDetailRecord[];
  }
  return [];
}
