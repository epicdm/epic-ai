/**
 * Runtime Adapters
 *
 * Channel-specific adapters that bridge the runtime to different platforms.
 *
 * @module runtime/adapters
 */

// ============================================================================
// Voice Adapter (LiveKit / Telephony)
// ============================================================================

export {
  handleVoiceTurn,
  handleStreamingTranscript,
  resolveAgentFromDid,
  getOrCreateVoiceSession,
  endVoiceSession,
  initiateTransfer,
  checkVoiceAdapterHealth,
  type VoiceTurnInput,
  type VoiceTurnResult,
  type VoiceSessionInfo,
  type StreamingVoiceInput,
  type TransferRequest,
} from "./voice-adapter";

// ============================================================================
// Future Adapters (placeholders)
// ============================================================================

// Chat Adapter (WebSocket / Widget)
// export { handleChatTurn } from "./chat-adapter";

// SMS Adapter (Twilio / etc)
// export { handleSmsTurn } from "./sms-adapter";

// Email Adapter (SMTP / etc)
// export { handleEmailTurn } from "./email-adapter";

// Webhook Adapter (Generic HTTP)
// export { handleWebhookTurn } from "./webhook-adapter";
