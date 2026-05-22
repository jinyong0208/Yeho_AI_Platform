# Invoice Schema

## tenant_invoice_application

Stores tenant invoice application records.

Columns:

- `id`
- `tenant_id`
- `invoice_title`
- `tax_no`
- `amount_cny`
- `invoice_type`
- `status`
- `email`
- `applied_at`
- `issued_at`
- `remark`
- `created_at`
- `updated_at`

Indexes:

- `idx_tenant_invoice_application_tenant_created`
- `idx_tenant_invoice_application_status`

Status values:

- `APPLIED`
- `PROCESSING`
- `ISSUED`
- `REJECTED`

The first version stores records only. Official tax-control integration remains a later phase.
