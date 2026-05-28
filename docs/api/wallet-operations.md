# Wallet Operations API

Wallet operations are part of the MVP close-out scope. The platform uses Credits for billing and does not expose provider cost directly to gateway clients.

## Wallet Balance

```http
GET /api/v1/wallets/{tenantId}
```

Roles:

- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `FINANCE`
- `DEVELOPER`

Tenant isolation:

- `SUPER_ADMIN` can query any tenant.
- Tenant users can only query their own tenant.

## Manual Recharge

```http
POST /api/v1/wallets/{tenantId}/recharge
Content-Type: application/json

{
  "amountCredits": 100000,
  "remark": "manual adjustment"
}
```

Roles:

- `SUPER_ADMIN`
- `FINANCE`

This direct recharge API writes `tenant_wallet_log` immediately. For auditable recharge operation, prefer the recharge order flow below.

## Recharge Order Flow

### Create Order

```http
POST /api/v1/recharge-orders
Content-Type: application/json

{
  "tenantId": 2057485859385335809,
  "amountCny": 100,
  "credits": 100000,
  "payChannel": "BANK_TRANSFER",
  "payerName": "Acme Ltd.",
  "payerAccount": "1234",
  "paymentProofNo": "bank-voucher-001",
  "remark": "offline transfer"
}
```

Roles:

- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `FINANCE`

Initial status:

- `CREATED`

Self-service rule:

- Tenant admins can submit and view their own recharge orders.
- The user should include the order number in the offline payment remark.
- `payerName`, `payerAccount`, and `paymentProofNo` are optional reconciliation fields.
- Credits are not posted until finance confirmation.

### Confirm Order

```http
POST /api/v1/recharge-orders/{id}/confirm
```

Behavior:

- Only `SUPER_ADMIN` and `FINANCE` can confirm.
- Only `CREATED` orders can be confirmed.
- Sets status to `PAID`.
- Writes `paid_at`.
- Adds credits to `tenant_wallet`.
- Writes `tenant_wallet_log` with the recharge order number.

### Close Order

```http
POST /api/v1/recharge-orders/{id}/close
```

Behavior:

- Only `SUPER_ADMIN` and `FINANCE` can close.
- Only `CREATED` orders can be closed.
- Sets status to `CLOSED`.
- Does not change wallet balance.

## Wallet Logs

```http
GET /api/v1/wallets/{tenantId}/logs?limit=100
```

Wallet logs include:

- recharge
- reserve
- release
- settle
- top-up for underestimated AI usage

Prompt content is not stored in wallet logs.

## Low Balance Alerts

```http
GET /api/v1/wallets/alerts/low-balance?tenantId=2057485859385335809&thresholdCredits=10000&limit=100
```

Response:

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "tenant_id": 2057485859385335809,
      "tenant_code": "default",
      "tenant_name": "Default Tenant",
      "balance_credits": 8000,
      "frozen_credits": 0,
      "total_recharge_credits": 100000,
      "total_used_credits": 92000,
      "updated_at": "2026-05-22T12:00:00"
    }
  ]
}
```

Rules:

- Default threshold is `10000` Credits.
- `SUPER_ADMIN` can omit `tenantId` to list all low-balance tenants.
- Tenant users are scoped to their own `tenant_id`.

## MVP Notes

- No real payment gateway is integrated in MVP.
- Offline/manual recharge confirmation is supported.
- Invoice and formal payment provider integration remain future work.
