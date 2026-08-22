# Core Data Model

```text
User
 └── Subscription
      ├── Plan
      ├── Subscription Items
      ├── Billing Cycle
      ├── Payment
      └── Entitlements
```

Subscription states:

```text
TRIAL
ACTIVE
PAST_DUE
PAUSED
CANCELLED
EXPIRED
```

Entitlement tiers:

```text
FREE
PREMIUM
ENTERPRISE
```
