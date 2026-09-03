# Copilot Prompt Injection Defense

Prompt injection is prevented through architectural separation:

1. **Read-Only State:** The AI uses a restricted API key that can only query read models if we migrate to an Agentic architecture. Currently, it's a stateless inference call.
2. **Untrusted Data Boundaries:** Customer names, checkout metadata, and order payloads are stringified into a rigid context block. The system prompt explicitly commands the model not to accept operational commands from this block.
3. **Structured Outputs:** By enforcing Zod JSON schema, malicious text injections that attempt to break structure are rejected.
4. **No Direct Execution:** Even if an injection forces an "action", it merely drops a `PROPOSED` row into the database. It cannot execute.
