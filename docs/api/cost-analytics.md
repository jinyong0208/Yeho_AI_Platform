# Cost Analytics API

Cost Analytics provides lightweight cost, revenue, profit, credit, and token statistics based on `ai_usage_log`.

It is part of Yeho AI Platform's Billing and Audit capability layer. It does not store customer documents, chunks, or vectors.

## Summary

```http
GET /api/v1/analytics/costs/summary?days=7
Authorization: Bearer <console-token>
```

Query parameters:

- `days`: Optional. Supported range is `1` to `90`. Defaults to `7`.

Response:

```json
{
  "code": 0,
  "data": {
    "days": 7,
    "requests": 120,
    "successRequests": 118,
    "inputTokens": 52000,
    "outputTokens": 18000,
    "totalTokens": 70000,
    "credits": 86000,
    "cost": 42.35,
    "profit": 85957.65,
    "daily": [],
    "providers": [],
    "models": [],
    "tenants": [],
    "apiKeys": []
  }
}
```

## Provider Costs

```http
GET /api/v1/analytics/costs/providers?days=7
Authorization: Bearer <console-token>
```

Response:

```json
{
  "code": 0,
  "data": [
    {
      "dimension": "QWEN",
      "dimensionName": "QWEN",
      "requests": 80,
      "successRequests": 79,
      "inputTokens": 30000,
      "outputTokens": 9000,
      "totalTokens": 39000,
      "credits": 46000,
      "cost": 18.25,
      "profit": 45981.75
    }
  ]
}
```

## Notes

- `credits` comes from `ai_usage_log.charge_credits`.
- `cost` comes from `ai_usage_log.real_cost`.
- `profit` is currently calculated as `sum(charge_credits) - sum(real_cost)`.
- This is a lightweight operational dashboard, not a complex BI module.
- Future pricing versions can refine profit calculation units and exchange rules.
