Input: Transcript includes phone/email/name.
Policy: pii_allowed=false.
Expected:
- episodic summary redacts PII
- warning includes pii_detected_and_redacted
