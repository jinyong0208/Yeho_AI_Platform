# API, Gateway, Billing, And Security

## OpenAI-Compatible API

Primary endpoint:

```http
POST /v1/chat/completions
```

Must support:

- `model`
- `messages`
- `temperature`
- `max_tokens`
- `stream: false`

Do not add in MVP unless explicitly requested:

- Function Calling
- Tool Calling
- Agent Workflow execution
- Centralized RAG execution
- Multi-Agent runtime

## Provider Adapter Rule

All provider calls must go through an adapter abstraction.

Required pattern:

```java
public interface AiProviderAdapter {
    ChatResponse chat(ChatRequest request);
}
```

Allowed adapters:

- OpenAiAdapter
- DeepSeekAdapter
- QwenAdapter
- ClaudeAdapter
- OllamaAdapter
- VllmAdapter

Business code and controllers must not directly call provider SDKs.

## API Key And Scope

Tenant API Keys:

- Store only hash and prefix.
- Show full key only once on creation.
- Never log full key.
- Support status, expiration, scopes, and last-used timestamp.

Scope examples:

- `chat:completion`
- `billing:read`
- `usage:read`
- `admin:*`
- `provider:test`

OpenAI-compatible API must validate the required scope.

## Provider Secret Handling

Provider API Keys:

- Must be encrypted at rest.
- Must be masked in UI and logs.
- Must not be returned in full after creation/update.

## Request And Audit

Every AI request must:

- Generate or propagate `request_id`
- Resolve tenant and API Key
- Check scope
- Check rate limit
- Check wallet balance
- Route model through Model Router
- Call provider through Adapter
- Record token usage
- Calculate real cost, charge credits, and profit
- Write usage log and audit log

Do not log:

- Full prompt
- Full messages payload
- API Key
- Provider secret
- Sensitive customer data

## Billing Rules

Use Credits as platform billing unit.

Wallet operations:

- Transactional
- No negative balance
- Record wallet log for recharge, adjustment, freeze, unfreeze, charge, refund

Cost analytics should support:

- Provider
- Model
- Tenant
- API Key
- Daily

## Error Body

OpenAI-compatible errors should follow the common shape:

```json
{
  "error": {
    "message": "Human readable error",
    "type": "invalid_request_error",
    "code": "rate_limit_exceeded",
    "param": null
  }
}
```

Rate-limit and billing failures must be clear and safe to expose.

