# Test Case Index


| ID | Area | Scenario | Expected |
|---|---|---|---|
| TC-001 | Auth | Register valid user | User created |
| TC-002 | Auth | Login with valid credentials | Token returned |
| TC-003 | Auth | Login with invalid credentials | 401 response |
| TC-004 | Product | Create valid product | Product created |
| TC-005 | Product | Request unknown product | 404 response |
| TC-006 | Feed | Create feed session | Session ID returned |
| TC-007 | Feed | Use invalid session ID | 404 response |
| TC-008 | Recommendation | Request recommendations | Ranked results returned |
| TC-009 | Subscription | Create subscription | Active/trial state returned |
| TC-010 | Subscription | Cancel active subscription | Cancelled state returned |
| TC-011 | Payment | Create payment | Payment created |
| TC-012 | Entitlement | Read premium entitlements | Correct entitlements returned |
| TC-013 | Authorization | Access another user's resource | 403/404 according to contract |
| TC-014 | Validation | Send malformed payload | 400 response |
| TC-015 | Idempotency | Repeat supported mutation | No duplicate side effect |
