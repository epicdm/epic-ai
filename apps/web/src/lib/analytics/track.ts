export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== "undefined" && window.analytics) {
    window.analytics.track(event, properties);
  }
}
