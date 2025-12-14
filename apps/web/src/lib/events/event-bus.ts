/**
 * Simple in-process event bus for automations.
 * In production, this could be replaced with Redis pub/sub or a message queue.
 */

type EventHandler = (data: Record<string, unknown>) => Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(event: string, handler: EventHandler) {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(event, [...existing, handler]);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event) || [];
      this.handlers.set(
        event,
        handlers.filter((h) => h !== handler)
      );
    };
  }

  async emit(event: string, data: Record<string, unknown>) {
    const handlers = this.handlers.get(event) || [];

    // Execute all handlers (don't wait, fire and forget for non-blocking)
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event types
export const Events = {
  // Lead events
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  LEAD_STATUS_CHANGED: "lead.status_changed",
  LEAD_DELETED: "lead.deleted",

  // Call events
  CALL_STARTED: "call.started",
  CALL_COMPLETED: "call.completed",
  CALL_FAILED: "call.failed",

  // Voice agent events
  AGENT_CREATED: "agent.created",
  AGENT_UPDATED: "agent.updated",

  // Social events (from native OAuth webhooks)
  SOCIAL_POST_PUBLISHED: "social.post_published",
  SOCIAL_ENGAGEMENT: "social.engagement",
} as const;

export type EventType = (typeof Events)[keyof typeof Events];
