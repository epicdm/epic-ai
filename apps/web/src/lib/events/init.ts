import { initializeAutomationListeners } from "../automations/engine";

let initialized = false;

/**
 * Initialize all event listeners
 * Call this once at app startup
 */
export function initializeEvents() {
  if (initialized) return;

  console.log("🔌 Initializing event system...");
  initializeAutomationListeners();
  initialized = true;
  console.log("✅ Event system initialized");
}

/**
 * Check if events are initialized
 */
export function isEventsInitialized(): boolean {
  return initialized;
}
