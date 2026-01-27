// Prompt runner stub: loads prompt + calls provider + validates output
export async function runPrompt(_args: {
  promptKey: string;
  promptVersion?: number;
  input: unknown;
}) {
  // TODO Sprint 2: implement LLM call + JSON repair retry + zod validation
  return { status: "stub" as const };
}
