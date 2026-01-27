# Job Payloads

## agent_assemble_v1
Payload:
- companyId (required)
- websiteUrl (optional)
- desiredTemplateKey (optional)
- channels (optional; default ["voice"])
- userAnswers (optional)
- agentId (optional; if provided must be DRAFT)
- force (optional; default false)

Output:
- AgentWizardSnapshot (strict schema)
