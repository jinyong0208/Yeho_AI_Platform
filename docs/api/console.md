# Phase 4 Console

Phase 4 connects the React management console to the gateway, billing, and usage APIs delivered in Phase 2 and Phase 3.

## Pages

- Dashboard: tenant, provider, model, wallet, and recent usage overview.
- Model Providers: list, create, and disable AI providers.
- Model Configs: list, create, and disable model routes.
- API Keys: list, create, and revoke tenant API keys.
- Wallet Balance: view wallet totals and create or confirm recharge orders.
- Wallet Ledger: view wallet transaction logs.
- Usage Logs: filter gateway call logs by tenant, model, and result.
- Token Stats: view usage summary and token mix.

## Backend APIs Used

- `GET /api/v1/providers`
- `POST /api/v1/providers`
- `DELETE /api/v1/providers/{id}`
- `GET /api/v1/models`
- `POST /api/v1/models`
- `DELETE /api/v1/models/{id}`
- `GET /api/v1/tenants/{tenantId}/api-keys`
- `POST /api/v1/tenants/{tenantId}/api-keys`
- `DELETE /api/v1/tenants/{tenantId}/api-keys/{id}`
- `GET /api/v1/wallets/{tenantId}`
- `POST /api/v1/wallets/{tenantId}/recharge`
- `GET /api/v1/wallets/{tenantId}/logs`
- `GET /api/v1/recharge-orders`
- `POST /api/v1/recharge-orders`
- `POST /api/v1/recharge-orders/{id}/confirm`
- `GET /api/v1/usage-logs`
- `GET /api/v1/usage-stats/summary`

## Security Notes

- Console APIs are protected by the existing bearer-token login session.
- Provider API keys are only submitted to the backend and are not rendered back in the list view.
- Tenant API keys show the full key only in the creation modal response.
- Usage log pages show request metadata and error summaries, not full prompt bodies.

## Verification

Run:

```bash
cd apps/platform
mvn -DskipTests compile

cd ../web
npm run build
```

Then refresh the Docker web and platform services:

```bash
docker compose build platform web
docker compose up -d platform web
```
