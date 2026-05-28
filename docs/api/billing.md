# Billing API

## Wallet

### GET /api/v1/wallets/{tenantId}

Returns the tenant wallet balance.

### POST /api/v1/wallets/{tenantId}/recharge

Manual recharge endpoint for admin operations.

```json
{
  "amountCredits": 1000,
  "remark": "manual recharge"
}
```

### GET /api/v1/wallets/{tenantId}/logs

Returns wallet movements such as recharge, reserve, release, and settle.

## Recharge Orders

### POST /api/v1/recharge-orders

Creates a recharge order.

```json
{
  "tenantId": 2057485859385335809,
  "amountCny": 1.00,
  "credits": 1000,
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

Tenant admins can create and view their own recharge orders. Finance or platform admins confirm offline payment and post credits.

### POST /api/v1/recharge-orders/{id}/confirm

Marks a recharge order as `PAID` and credits the tenant wallet.

Roles:

- `SUPER_ADMIN`
- `FINANCE`

### GET /api/v1/recharge-orders

Lists recharge orders. `tenantId` and `limit` are optional.

## Usage Logs

### GET /api/v1/usage-logs

Query parameters:

- `tenantId`
- `apiKeyId`
- `providerCode`
- `modelCode`
- `success`
- `from`
- `to`
- `limit`

### GET /api/v1/usage-stats/summary

Returns request count, success/failure count, token totals, charged credits, real cost, and profit.
