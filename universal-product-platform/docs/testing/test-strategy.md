# Testing Strategy

## Test Levels

### Unit
Validate isolated business rules and service functions.

### Integration
Validate service-to-service behavior:

- Recommendation ↔ Product
- Subscription ↔ Payment
- Subscription ↔ Entitlement
- Feed ↔ Recommendation

### API
Validate:

- Authentication and authorization
- Request validation
- Status codes
- Response schemas
- Error handling
- Feed sessions
- Recommendations
- Subscriptions
- Payments
- Entitlements

### End-to-End

Primary flow:

```text
Register
  ↓
Login
  ↓
Browse Product
  ↓
Receive Recommendation
  ↓
Select Subscription
  ↓
Complete Payment
  ↓
Activate Entitlements
  ↓
Receive Premium Recommendations
```

## Quality gates

- Every endpoint has positive and negative API tests.
- Invalid authentication must be rejected.
- Resource ownership must be verified.
- Duplicate operations must be handled safely.
- Expired/invalid sessions must return documented errors.
- API contracts must remain backward compatible.
