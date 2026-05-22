# Invoice API

The invoice module records tenant invoice applications. The first version only tracks application status and does not integrate with an official tax-control provider.

## Status

- `APPLIED`
- `PROCESSING`
- `ISSUED`
- `REJECTED`

## POST /api/v1/invoice-applications

Create an invoice application.

Roles:

- `SUPER_ADMIN`
- `TENANT_ADMIN`
- `FINANCE`

Request:

```json
{
  "tenantId": "2057485859385335809",
  "invoiceTitle": "Default Tenant Ltd.",
  "taxNo": "91310000XXXXXXXXXX",
  "amountCny": "1000.00",
  "invoiceType": "SPECIAL_VAT",
  "email": "finance@example.com",
  "remark": "Monthly recharge invoice"
}
```

## GET /api/v1/invoice-applications

List invoice applications.

Query parameters:

- `tenantId`
- `status`
- `limit`

Non-super-admin users are scoped to their own tenant.

## GET /api/v1/invoice-applications/{id}

Get one invoice application.

## POST /api/v1/invoice-applications/{id}/process

Mark an application as `PROCESSING`.

Roles:

- `SUPER_ADMIN`
- `FINANCE`

## POST /api/v1/invoice-applications/{id}/issue

Mark an application as `ISSUED` and set `issued_at`.

Roles:

- `SUPER_ADMIN`
- `FINANCE`

## POST /api/v1/invoice-applications/{id}/reject

Mark an application as `REJECTED`.

Roles:

- `SUPER_ADMIN`
- `FINANCE`
