# Model Price Versions

Model price versioning is part of the MVP close-out scope for cost and profit accuracy.

The goal is to keep historical usage logs tied to the pricing snapshot used at request time. Updating the current model price must not mutate historical usage cost/profit meaning.

## Database

New table:

- `ai_model_price_version`

Updated tables:

- `ai_model.current_price_version_id`
- `ai_usage_log.price_version_id`

## Price Version Fields

Each version stores:

- `model_id`
- `version_no`
- `input_price`
- `output_price`
- `input_credit_rate`
- `output_credit_rate`
- `billing_multiplier`
- `effective_at`
- `remark`

## List Price Versions

```http
GET /api/v1/models/{modelId}/price-versions
```

Role:

- `SUPER_ADMIN`

Response:

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "id": 2057800000000000001,
      "modelId": 2057643291887177729,
      "versionNo": 2,
      "inputPrice": 0.000001,
      "outputPrice": 0.000002,
      "inputCreditRate": 1,
      "outputCreditRate": 2,
      "billingMultiplier": 1,
      "effectiveAt": "2026-05-22T12:30:00",
      "remark": "May provider price update"
    }
  ]
}
```

## Create Price Version

```http
POST /api/v1/models/{modelId}/price-versions
Content-Type: application/json

{
  "inputPrice": 0.000001,
  "outputPrice": 0.000002,
  "inputCreditRate": 1,
  "outputCreditRate": 2,
  "billingMultiplier": 1,
  "remark": "May provider price update"
}
```

Behavior:

- Creates a new `ai_model_price_version` row.
- Updates `ai_model.current_price_version_id`.
- Updates current price fields on `ai_model`.
- Missing numeric fields fall back to the current model value.

## Model Update Behavior

`PUT /api/v1/models/{modelId}` also creates a price version when any of these fields change:

- `inputPrice`
- `outputPrice`
- `inputCreditRate`
- `outputCreditRate`
- `billingMultiplier`

Non-price model updates do not create price versions.

## Usage Log Behavior

Gateway usage logs write `ai_usage_log.price_version_id` from `ai_model.current_price_version_id` at request time.

This applies to:

- `POST /v1/chat/completions`
- `POST /v1/embeddings`

Historical usage logs continue to store:

- `real_cost`
- `charge_credits`
- `profit`

So analytics can remain stable even when current model prices change later.
