"""
Callback Time Computation v1

Derives ISO datetime strings for callback windows.
Uses best-effort deterministic approximations.
"""

from __future__ import annotations
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

def compute_callback_time(window_key: str, tz_name: str = "America/Dominica") -> str | None:
    """
    Returns ISO datetime string for a reasonable target time.

    Args:
        window_key: Callback window identifier
        tz_name: Timezone name (default: America/Dominica)

    Returns:
        ISO datetime string or None if window_key unknown

    Window keys:
        - asap_15min: Now + 15 minutes
        - today: +2 hours if before 5pm, else next day 10am
        - tomorrow_morning: Next day 10am
        - tomorrow_afternoon: Next day 2pm
    """
    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)

    # ASAP: 15 minutes from now
    if window_key == "asap_15min":
        return (now + timedelta(minutes=15)).isoformat()

    # Today: +2 hours if before 5pm, else next day 10am
    if window_key == "today":
        if now.hour < 17:
            return (now + timedelta(hours=2)).isoformat()
        tomorrow = (now + timedelta(days=1)).date()
        return datetime.combine(tomorrow, time(10, 0), tzinfo=tz).isoformat()

    tomorrow_date = (now + timedelta(days=1)).date()

    # Tomorrow morning: 10am
    if window_key == "tomorrow_morning":
        return datetime.combine(tomorrow_date, time(10, 0), tzinfo=tz).isoformat()

    # Tomorrow afternoon: 2pm
    if window_key == "tomorrow_afternoon":
        return datetime.combine(tomorrow_date, time(14, 0), tzinfo=tz).isoformat()

    # Unknown window key
    return None
