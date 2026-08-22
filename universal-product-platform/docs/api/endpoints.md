# API Endpoint Catalog

## Identity

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/logout
POST /v1/auth/refresh
GET  /v1/users/{userId}
```

## Products

```text
POST   /v1/products
GET    /v1/products
GET    /v1/products/{productId}
PUT    /v1/products/{productId}
DELETE /v1/products/{productId}
```

## Recommendations

```text
POST /v1/recommendations
GET  /v1/recommendations/{userId}
GET  /v1/recommendations/similar/{productId}
POST /v1/recommendations/events
POST /v1/recommendations/feedback
```

## Feed

```text
POST /v1/feed/sessions
POST /v1/feed/sessions/{sessionId}/moods
GET  /v1/feed/sessions/{sessionId}
GET  /v1/feed/sessions/{sessionId}/items
```

## Subscriptions

```text
GET  /v1/subscription/plans
POST /v1/subscriptions
GET  /v1/subscriptions/{subscriptionId}
POST /v1/subscriptions/{subscriptionId}/upgrade
POST /v1/subscriptions/{subscriptionId}/downgrade
POST /v1/subscriptions/{subscriptionId}/cancel
POST /v1/subscriptions/{subscriptionId}/resume
GET  /v1/users/{userId}/subscriptions
GET  /v1/users/{userId}/entitlements
```

## Payments

```text
POST /v1/payments
GET  /v1/payments/{paymentId}
POST /v1/payments/{paymentId}/refund
```
