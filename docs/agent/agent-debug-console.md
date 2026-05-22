# Agent Debug Console

The Agent Debug page provides a management-console entry point for the Phase 5 Demo Agent.

Frontend route:

- `/agent-debug`

Backend API:

- `POST /api/v1/agents/demo/run`

Request:

```json
{
  "input": "check deepseek model routing",
  "context": {
    "source": "console",
    "scenario": "agent-debug"
  }
}
```

Response fields:

- `requestId`
- `agentCode`
- `intent`
- `answer`
- `steps`
- `metadata`
- `latencyMs`

The console calls the Java platform API instead of calling the Python Agent service directly. Java keeps the authenticated user, tenant context, and request tracing boundary.
