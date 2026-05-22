# AI Gateway Deployment

## Local Bootstrap

The platform boots with a default tenant and demo gateway data for local testing:

- default tenant: `default`
- demo API key: `yh_sk_demo_default_key`
- mock provider base URL: `http://localhost:8080/mock-provider/v1`

## DeepSeek / Qwen Configuration

1. Create or update an `ai_provider` row with `provider_code = DEEPSEEK` or `QWEN`
2. Set `base_url` to an OpenAI-compatible endpoint
3. Store the provider API key encrypted in `api_key_encrypted`
4. Create matching `ai_model` rows with the desired `model_code`
5. Create a tenant API key and use it in `Authorization: Bearer <key>`

## Test Command

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer yh_sk_demo_default_key" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello gateway"}],"temperature":0.7,"max_tokens":64,"stream":false}'
```

Run the local gateway integration smoke after the platform is up:

```powershell
.\scripts\smoke-gateway-integration.ps1
```

This smoke uses the local mock provider and verifies chat completions, embeddings, usage logs, wallet deduction, request ids, and API-key RPM limiting.
