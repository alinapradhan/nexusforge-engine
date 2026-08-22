# Architecture Overview — NexusForge Engine

NexusForge Engine is architected as an API-first modular application platform that decouples client applications, domain backend services, core platform middleware, and data management.

```text
Applications Layer
    │
    ├── Web Operations Dashboard (apps/web)
    ├── CLI Tooling (bin/nexusforge.js)
    └── External API Clients / Mobile Apps
    │
    ▼
API Gateway & Router (src/server.js)
    │
    ├── CORS & Content Parsing
    ├── Request Logging & Rate Limiting
    ├── JWT Authentication & Admin RBAC
    │
    ▼
Domain Backend Services (services/)
    ├── Identity Service        (Auth, Users, RBAC, Profiles)
    ├── Product Service         (Catalog, Categories, Search, Stock)
    ├── Subscription Service    (Plans, Subscriptions, Entitlements)
    ├── Recommendation Service (Personalization, Similarity, Feed)
    ├── Payment Service         (Checkout, Transactions, Refunds)
    └── Analytics Service       (Telemetry, Metrics, Event Log)
    │
    ▼
Data Layer (database/store.js)
    └── In-Memory Seeded Repository with JSON Persistence Support
```

## Engineering Principles

1. **API-First Design:** Every feature is exposed via consistent RESTful endpoints before UI consumption.
2. **Modular Boundaries:** Domain logic lives strictly in isolated service modules under `services/<domain>`.
3. **Zero-Dependency Core Testing:** Tests run directly on Node's native test runner without external framework bloat.
4. **Local-First Executability:** Instant execution with no required cloud infrastructure setup or external server dependencies.
