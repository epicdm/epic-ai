"""
Template Runtime v1

Enhanced templating for flow prompts with filter support.

Features:
- Token replacement: {{session.caller}}, {{tool.magnus.customer.customer.name}}
- Filter support: {{value | default:"text"}}, {{value | upper}}
- Safe defaults for missing values
- Works on strings (render_text) and nested structures (render_any)

Supported Filters (v1):
- default:"text" - Default value if missing/empty
- upper - Convert to uppercase
- lower - Convert to lowercase
- digits - Keep only digits and + (phone cleanup)
- json - Convert to JSON string (debug)

Examples:
- {{session.caller | digits}}
- {{tool.magnus.customer.customer.name | default:"there" | upper}}
- {{tool.magnus.customer.found | default:"false"}}
- {{tool | json}} (debug)
"""

from __future__ import annotations
from typing import Any, Dict, Optional
import json
import re

TOKEN_RE = re.compile(r"\{\{\s*(.*?)\s*\}\}")

def _get_path(obj: Dict[str, Any], path: str) -> Any:
    """
    Get value from nested dict using dot notation.

    Args:
        obj: Dictionary to traverse
        path: Dot-separated path (e.g., "tool.magnus.customer.name")

    Returns:
        Value at path or None if not found
    """
    cur: Any = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur

def _to_str(v: Any) -> str:
    """
    Convert value to string safely.

    Args:
        v: Value to convert

    Returns:
        String representation
    """
    if v is None:
        return ""
    if isinstance(v, (dict, list)):
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return str(v)
    return str(v)

def _apply_filter(value: Any, filt: str) -> Any:
    """
    Apply a filter to a value.

    Supported v1 filters:
      default:"text" - Default value if missing/empty
      upper - Convert to uppercase
      lower - Convert to lowercase
      digits - Keep only digits and +
      json - Convert to JSON string

    Args:
        value: Value to filter
        filt: Filter expression (e.g., 'default:"Unknown"', 'upper')

    Returns:
        Filtered value
    """
    filt = filt.strip()

    # default:"x" or default:'x' or default:x
    if filt.startswith("default:"):
        arg = filt[len("default:"):].strip()
        # Remove quotes if present
        if (arg.startswith('"') and arg.endswith('"')) or (arg.startswith("'") and arg.endswith("'")):
            arg = arg[1:-1]
        # Return default if value is empty/missing
        if value is None or value == "" or value == [] or value == {}:
            return arg
        return value

    # upper - convert to uppercase
    if filt == "upper":
        return _to_str(value).upper()

    # lower - convert to lowercase
    if filt == "lower":
        return _to_str(value).lower()

    # digits - keep only digits and + (phone cleanup)
    if filt == "digits":
        s = _to_str(value)
        out = []
        for ch in s:
            if ch.isdigit() or ch == "+":
                out.append(ch)
        return "".join(out)

    # json - convert to JSON string (debug)
    if filt == "json":
        try:
            return json.dumps(value, ensure_ascii=False)
        except Exception:
            return _to_str(value)

    # Unknown filter: no-op (safe)
    return value

def render_text(template: str, ctx: Dict[str, Any]) -> str:
    """
    Render a template string with tokens and filters.

    Examples:
      {{session.caller}}
      {{tool.magnus.customer.found | default:"false"}}
      {{tool.magnus.customer.customer.name | default:"there" | upper}}

    Args:
        template: Template string with {{tokens}}
        ctx: Context dict (e.g., {"session": {...}, "tool": {...}})

    Returns:
        Rendered string with tokens replaced
    """
    if not isinstance(template, str) or "{{" not in template:
        return template if isinstance(template, str) else _to_str(template)

    def replace(match: re.Match) -> str:
        expr = match.group(1).strip()
        # Split filters: path | filt | filt
        parts = [p.strip() for p in expr.split("|") if p.strip()]
        if not parts:
            return ""

        # First part is the path
        path = parts[0]
        value = _get_path(ctx, path)

        # Apply filters in sequence
        for f in parts[1:]:
            value = _apply_filter(value, f)

        return _to_str(value)

    return TOKEN_RE.sub(replace, template)

def render_any(value: Any, ctx: Dict[str, Any]) -> Any:
    """
    Render templates inside dict/list structures (for node.input, etc.).
    Only templates inside strings are processed.

    Examples:
      {"phone": "{{session.caller}}"} → {"phone": "+17675551234"}
      ["{{session.caller}}", "test"] → ["+17675551234", "test"]
      "{{session.caller}}" → "+17675551234"
      123 → 123 (unchanged)

    Args:
        value: Value to render (can be dict, list, str, or primitive)
        ctx: Context dict

    Returns:
        Rendered value with templates replaced
    """
    if isinstance(value, dict):
        return {k: render_any(v, ctx) for k, v in value.items()}
    if isinstance(value, list):
        return [render_any(v, ctx) for v in value]
    if isinstance(value, str):
        return render_text(value, ctx)
    return value
