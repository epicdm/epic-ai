# Build Pack (Source of Truth)

This folder is the canonical specification for AI Agent OS v1.

Coding agents MUST:
- Treat these docs as the source of truth
- Map implementation to TRACEABILITY.md
- Validate prompt outputs against schemas
- Implement golden tests for non-negotiable constraints

If CHAT_SPEC_FULL.txt exists, it provides extended context. When conflicts exist,
these docs take precedence (PRODUCT_SPEC.md, API_CONTRACTS.md, TRACEABILITY.md).
