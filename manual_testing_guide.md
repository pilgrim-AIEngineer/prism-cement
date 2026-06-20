# BuildBid — Manual Testing Guide (End-to-End)

> **App URL:** `http://localhost:3000` (dev server via `npm run dev`)  
> **Mock OTP:** `123456` (any phone number accepted in MVP)  
> **Admin phone:** Set in your `.env` — look for `ADMIN_PHONE` or seed the DB with a known admin account.

---

## Test Environment Setup

Before starting, ensure:
- `npm run dev` is running (`http://localhost:3000` responds)
- Database is migrated (`npx prisma migrate dev`)
- At least one **Category** exists in the DB (e.g., "Cement", "Steel")
- At least one **City** is seeded as active in the `cities` table

Use separate browser profiles (or incognito tabs) for each role simultaneously.

---

## Role Accounts to Create

| Role | Phone | Purpose |
|---|---|---|
| Admin | (pre-seeded) | Platform control |
| Builder 1 | `9000000001` | Happy-path builder |
| Builder 2 | `9000000002` | Cross-ownership tests |
| Vendor 1 | `9000000010` | Approved vendor (cement) |
| Vendor 2 | `9000000011` | Unapproved vendor |

---

## Module 1: Authentication & Onboarding

### TC-AUTH-01 — Login page loads for unauthenticated users

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `http://localhost:3000` | Redirected to `/login` |
| 2 | Navigate to `/admin` directly | Redirected to `/login` |
| 3 | Navigate to `/builder` directly | Redirected to `/login` |
| 4 | Navigate to `/vendor` directly | Redirected to `/login` |

---

### TC-AUTH-02 — Mock OTP login with incorrect OTP

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/login`, enter phone `9000000001` | OTP field appears / form progresses |
| 2 | Enter OTP `999999` | Error: "Incorrect OTP. Use the mock code to sign in." |
| 3 | Enter OTP `123456` | Success — redirected to `/onboarding` (first login) or role dashboard |

---

### TC-AUTH-03 — Builder onboarding

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login with new phone `9000000001`, OTP `123456` | Redirected to `/onboarding` |
| 2 | Select role **Builder** | Builder profile fields shown (name, company, email, city) |
| 3 | Submit with empty `name` | Validation error: name required |
| 4 | Fill: Name="Test Builder", Company="BuildCo", Email="builder@test.com", City="Mumbai" | — |
| 5 | Submit | Redirected to `/builder` dashboard. Account status = PENDING |
| 6 | Attempt to create a project on dashboard | Blocked — "account must be verified" message |

---

### TC-AUTH-04 — Vendor onboarding

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login with new phone `9000000010`, OTP `123456` | Redirected to `/onboarding` |
| 2 | Select role **Vendor** | Vendor profile fields shown (name, company, email, GST, PAN, city) |
| 3 | Fill all fields and submit | Redirected to `/vendor` dashboard. Status = PENDING |
| 4 | Vendor feed should be empty / locked | Dashboard shows read-only state |

---

### TC-AUTH-05 — Rejected user cannot log in

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin rejects a user (see Module 2) | — |
| 2 | Rejected user attempts to login with correct OTP | Error: "Your application has been reviewed and was not approved..." |
| 3 | No session cookie issued | Cannot access any protected route |

---

### TC-AUTH-06 — Logout

| Step | Action | Expected Result |
|---|---|---|
| 1 | Any logged-in user clicks Logout | Redirected to `/` or `/login` |
| 2 | Navigate to `/builder` or `/vendor` after logout | Redirected to `/login` |
| 3 | Session cookie is deleted | Browser devtools shows no session cookie |

---

### TC-AUTH-07 — Duplicate phone registration blocked

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login with already-registered phone `9000000001`, OTP `123456` | Goes to role dashboard directly (no onboarding) |
| 2 | Manually navigate to `/onboarding` | Redirected to role dashboard (no duplicate account created) |

---

## Module 2: Admin — User Verification

### TC-ADMIN-USER-01 — Verify a Builder

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as Admin, go to `/admin` | Dashboard shows pending verification count |
| 2 | Click "Verify Users" → `/admin/users?status=PENDING` | List of pending users |
| 3 | Click on Builder 1's row → `/admin/users/{userId}` | User detail page with profile info |
| 4 | Click **Verify** | Status changes to VERIFIED. Audit log entry created. |
| 5 | In-app notification fires for Builder 1 | Builder sees "Account verified" notification |
| 6 | Builder 1 can now create projects | Dashboard unlocked |

---

### TC-ADMIN-USER-02 — Reject a user

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/admin/users/{userId}` for Builder 2 (PENDING) | — |
| 2 | Click **Reject** | Status → REJECTED |
| 3 | Attempt to Reject again | Error: "Cannot reject a user with status REJECTED" |
| 4 | Attempt to Verify a REJECTED user | Error: "Cannot verify a user with status REJECTED" (PENDING only) |

---

### TC-ADMIN-USER-03 — Suspend and Reinstate

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/admin/users/{userId}` for VERIFIED Builder 1 | — |
| 2 | Click **Suspend** | Status → SUSPENDED |
| 3 | Builder 1 tries to access `/builder` | Redirected to `/login`, session cookie deleted |
| 4 | Builder 1 tries to login with correct OTP | Session issued but immediately redirected out (middleware check) |
| 5 | Admin clicks **Reinstate** on Builder 1 | Status → VERIFIED. Builder 1 can login again. |

> **Note:** Suspension propagation has a ~30s middleware cache TTL. The user may have a brief window after suspension.

---

### TC-ADMIN-USER-04 — Cannot change Admin account status

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin navigates to any admin user's profile | No Verify/Suspend/Reject buttons visible |
| 2 | If callable via direct action: attempt to suspend admin userId | Error: "Cannot change an admin account's status" |

---

### TC-ADMIN-USER-05 — Approve Vendor Category

| Step | Action | Expected Result |
|---|---|---|
| 1 | Verify Vendor 1 (see TC-ADMIN-USER-01) | Vendor status = VERIFIED |
| 2 | On Vendor 1's user detail page, find category approvals section | Vendor's selected categories shown |
| 3 | Approve **Cement** category for Vendor 1 | `vendor_categories.verified = true`. Audit log written. |
| 4 | Vendor 1 receives "Category Approved" notification | Notification visible in `/vendor/notifications` |
| 5 | Vendor 1 can now see Cement requirements in feed | Feed shows open cement requirements |

---

### TC-ADMIN-USER-06 — Revoke Vendor Category

| Step | Action | Expected Result |
|---|---|---|
| 1 | Revoke Cement category from Vendor 1 | `vendor_categories.verified = false` |
| 2 | Vendor 1 refreshes feed | Cement requirements disappear from feed |
| 3 | Vendor 1 attempts to bid | Blocked: "You are not approved to bid in this category" |

---

## Module 3: Admin — Form Template Management

### TC-FORMS-01 — Create a form template

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin navigates to `/admin/forms` | List of existing templates |
| 2 | Create new template for **Cement** category | Template builder UI shown |
| 3 | Add field: key=`grade`, type=`select`, options=[OPC 43, OPC 53, PPC], required=true, visibleToVendor=true | — |
| 4 | Add field: key=`quantity`, type=`number`, unit=`bags`, min=1, required=true, visibleToVendor=true | — |
| 5 | Add field: key=`site_contact`, type=`text`, visibleToVendor=false | — |
| 6 | Save | Template created with version=1, status=ACTIVE. Audit log: `CREATE_FORM_TEMPLATE` |

---

### TC-FORMS-02 — Create updated version

| Step | Action | Expected Result |
|---|---|---|
| 1 | Edit the Cement form (add a new field) and save | New template created with version=2. Old v1 still ACTIVE. |
| 2 | "Live" template is v2 (highest-version ACTIVE) | New requirements use v2; existing pinned to v1 |

---

### TC-FORMS-03 — Archive the live template

| Step | Action | Expected Result |
|---|---|---|
| 1 | Archive template v2 | Status → ARCHIVED. Audit: `ARCHIVE_FORM_TEMPLATE` |
| 2 | No ACTIVE template for Cement now | Builder cannot create new Cement requirement (error shown) |
| 3 | Attempt to archive v1 (non-live, but ACTIVE since v2 is archived) | Should succeed since v1 is now the live one |

---

### TC-FORMS-04 — Archived template doesn't affect existing requirements

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create a requirement using v1 template | Requirement stores schema snapshot |
| 2 | Archive v1 template | Template archived |
| 3 | View existing requirement | Shows correct form data (snapshot preserved) |
| 4 | Attempt to edit DRAFT requirement | Validates against the pinned snapshot, not live template |

---

### TC-FORMS-05 — Duplicate field key validation

| Step | Action | Expected Result |
|---|---|---|
| 1 | Attempt to create a template with two fields having the same `key` | Error: duplicate keys rejected |

---

## Module 4: Builder — Projects

### TC-PROJ-01 — Create a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as verified Builder 1 | Goes to `/builder` dashboard |
| 2 | Go to `/builder/projects/new` | New project form |
| 3 | Enter Name="Tower A", City="Mumbai" (active launch city), Type="Residential" | — |
| 4 | Submit | Project created with status=DRAFT. Audit: `CREATE_PROJECT`. Redirected to project page. |
| 5 | Attempt to add a requirement | Blocked: "Activate the project before publishing its requirements" |

---

### TC-PROJ-02 — Activate a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | On project page, click **Activate** | Status → ACTIVE. Audit: `ACTIVATE_PROJECT` |
| 2 | Attempt to activate again | Error: "Only DRAFT projects can be activated" |

---

### TC-PROJ-03 — Edit a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Edit project name and city (ACTIVE project) | Succeeds. Audit: `UPDATE_PROJECT` |
| 2 | Edit with invalid/inactive city | Error: "Select a valid launch city" |
| 3 | Cross-ownership: Builder 2 attempts to edit Builder 1's project | Error: Unauthorized / Forbidden |

---

### TC-PROJ-04 — City validation is server-enforced

| Step | Action | Expected Result |
|---|---|---|
| 1 | Attempt to create a project with city="FakeCity" (not in active cities) | Error: "Select a valid launch city" |

---

## Module 5: Builder — Requirements

### TC-REQ-01 — Create a requirement (DRAFT)

| Step | Action | Expected Result |
|---|---|---|
| 1 | On an ACTIVE project, click "Add Requirement" | Category selector shown |
| 2 | Select **Cement** | Dynamic form rendered from live template |
| 3 | Fill: grade=OPC 53, quantity=500, site_contact="Ravi - 9988776655" | — |
| 4 | Submit | Requirement created (status=DRAFT, anonCode=REQ-XXXX). Audit: `CREATE_REQUIREMENT` |
| 5 | Edit the DRAFT requirement (change quantity to 600) | Succeeds. Audit: `EDIT_REQUIREMENT` |

---

### TC-REQ-02 — Cannot create requirement without active template

| Step | Action | Expected Result |
|---|---|---|
| 1 | Select a category that has no ACTIVE template | Error: "No active form template exists for this category. Ask Admin to create one..." |

---

### TC-REQ-03 — Publish a requirement (DRAFT → OPEN)

| Step | Action | Expected Result |
|---|---|---|
| 1 | Click **Publish** on a DRAFT requirement | Status → OPEN. Audit: `PUBLISH_REQUIREMENT` |
| 2 | Attempt to edit an OPEN requirement | Error: "Only DRAFT requirements can be edited" |
| 3 | Attempt to publish again | Error: "Only DRAFT requirements can be published" |

---

### TC-REQ-04 — Cannot publish if project is not ACTIVE

| Step | Action | Expected Result |
|---|---|---|
| 1 | Complete the project first (ACTIVE → COMPLETED) | — |
| 2 | Attempt to publish a DRAFT requirement on this project | Error: "Activate the project before publishing its requirements" |

---

### TC-REQ-05 — Cannot add requirements to ARCHIVED project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Archive a project | Status → ARCHIVED |
| 2 | Attempt to create a requirement for it | Error: "Cannot add requirements to an archived project" |

---

### TC-REQ-06 — Schema snapshot pinning

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create and publish a Cement requirement using v1 template | Snapshot v1 stored |
| 2 | Admin creates template v2 (new fields) | — |
| 3 | Existing requirement detail page | Still shows v1 fields only |
| 4 | Builder views their DRAFT requirement edit form | Validation uses v1 snapshot, not v2 |

---

## Module 6: Vendor — Feed & Bidding

### TC-VND-FEED-01 — Verified vendor sees feed

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as Vendor 1 (VERIFIED, Cement approved) | Goes to `/vendor` dashboard |
| 2 | Navigate to `/vendor/feed` | Open Cement requirements listed |
| 3 | Each requirement shows: REQ-XXXX, category, city zone, vendor-visible fields | No project name, no builder identity |
| 4 | `site_contact` field (visibleToVendor=false) is NOT shown | Serializer enforces `visibleToVendor` flag |

---

### TC-VND-FEED-02 — Unverified vendor sees no feed

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as Vendor 2 (PENDING/unverified) | Feed is empty or access blocked |
| 2 | Navigate to `/vendor/feed` | Error: "Your account must be verified to browse requirements" |

---

### TC-VND-FEED-03 — Vendor cannot see unapproved category requirements

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create an OPEN Steel requirement | — |
| 2 | Vendor 1 (approved only for Cement) checks feed | Steel requirement NOT in feed |
| 3 | Vendor 1 directly navigates to Steel requirement URL | Error: "You are not approved to view this requirement" |

---

### TC-VND-BID-01 — Submit a bid

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 opens a Cement requirement in feed | Detail page with bid form |
| 2 | Enter amount=₹250000 | — |
| 3 | Submit bid | Bid created (status=SUBMITTED). Audit: `BID_SUBMITTED` |
| 4 | Admin receives "New Bid" in-app notification | Admin sees notification in `/admin/notifications` |
| 5 | Vendor 1's `/vendor/bids` page shows the bid | Bid listed with REQ-XXXX, status SUBMITTED |

---

### TC-VND-BID-02 — One bid per vendor per requirement

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 submits a second bid on the same requirement | Bid UPDATED (not duplicate created). Audit: `BID_UPDATED` |
| 2 | Only one bid record exists for this vendor+requirement | Verified in vendor's bid list |

---

### TC-VND-BID-03 — Edit a submitted bid

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 re-submits with new amount ₹240000 | Amount updated, status stays SUBMITTED |
| 2 | Old amount reflected in audit `before`, new in `after` | — |

---

### TC-VND-BID-04 — Withdraw a bid

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 clicks Withdraw on their SUBMITTED bid | Status → WITHDRAWN. Audit: `BID_WITHDRAWN` |
| 2 | Vendor 1 can re-submit a new bid on same requirement | Bid updated back to SUBMITTED |
| 3 | Attempt to withdraw an already-WITHDRAWN bid | Error: "Only submitted bids can be withdrawn" |

---

### TC-VND-BID-05 — Cannot bid on non-OPEN requirement

| Step | Action | Expected Result |
|---|---|---|
| 1 | Attempt to submit bid on AWARDED requirement | Error: "This requirement is not open for bids" |
| 2 | Attempt to submit bid on COMPLETED requirement | Error: "This requirement is not open for bids" |
| 3 | Attempt to submit bid on requirement under non-ACTIVE project | Error: "This requirement is not open for bids" |

---

### TC-VND-BID-06 — Builder cannot see bid amounts or vendor identity

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder 1 views their OPEN requirement | Bid count shown only (if SHOW_BID_COUNT=true), no amounts, no names |
| 2 | Builder 1 navigates to `/admin/requirements` | Forbidden (redirected or error) |

---

## Module 7: Admin — Bid Review & Award

### TC-AWARD-01 — Admin reviews all bids

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin navigates to `/admin/requirements/{requirementId}` | Full bid list with vendor identities and amounts visible |
| 2 | Each bid shows: vendor name, vendor phone, amount | Full identity on both sides for admin only |

---

### TC-AWARD-02 — Select bid(s) and award

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin selects Vendor 1's bid | — |
| 2 | Clicks **Award** / **Select** | Requirement → AWARDED, selected bid → SELECTED, others → NOT_SELECTED |
| 3 | Audit logs: `AWARD_REQUIREMENT`, `SELECT_BID`, `NOT_SELECT_BID` | Each written correctly |
| 4 | Builder 1 receives "Requirement Awarded" notification | Notification visible in `/builder/notifications` — no vendor identity |
| 5 | Vendor 1 receives "Bid Selected" notification | Visible in `/vendor/notifications` — no builder/project identity |
| 6 | Other vendors receive "Bid Not Selected" notification | Neutral message only |

---

### TC-AWARD-03 — Cannot award already-AWARDED requirement

| Step | Action | Expected Result |
|---|---|---|
| 1 | Attempt to call `selectBids` on AWARDED requirement | Error: "This requirement is not OPEN or REOPENED — cannot award again" |

---

### TC-AWARD-04 — Optimistic lock: concurrent award

| Step | Action | Expected Result |
|---|---|---|
| 1 | Simulate two admin tabs both trying to award the same requirement simultaneously | One succeeds; second gets "not OPEN or REOPENED" error |

---

### TC-AWARD-05 — Mark award as BROKERED

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin clicks **Mark Brokered** on a PENDING award | Award → BROKERED. `brokeredAt` timestamp set. Audit: `BROKER_AWARD` |
| 2 | Attempt to broker again (already BROKERED) | Error: "Only PENDING awards can be marked as brokered" |

---

### TC-AWARD-06 — Complete award

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin clicks **Complete Award** on a BROKERED award | Award → COMPLETED. Bid → COMPLETED. Audit: `COMPLETE_AWARD`, `COMPLETE_BID` |
| 2 | Builder 1 gets "Award Completed" notification | No vendor identity in payload |
| 3 | Vendor 1 gets "Award Completed" notification | No builder/project identity in payload |
| 4 | Attempt to complete again | Error: "Only BROKERED awards can be completed" |

---

### TC-AWARD-07 — Admin manually closes an OPEN requirement

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin opens an OPEN requirement and clicks **Close** | Requirement → CLOSED. Audit: `CLOSE_REQUIREMENT` |
| 2 | Requirement disappears from vendor feed | — |
| 3 | Attempt to close again (already CLOSED) | Error: "Only OPEN or REOPENED requirements can be closed" |
| 4 | Attempt to close an AWARDED requirement | Error: "Only OPEN or REOPENED requirements can be closed" |

---

## Module 8: Completion & Reopen Flows

### TC-COMPLETE-01 — Complete a requirement (Builder)

| Step | Action | Expected Result |
|---|---|---|
| 1 | Ensure requirement is AWARDED and all awards are COMPLETED (no PENDING/BROKERED) | — |
| 2 | Builder 1 clicks **Complete Requirement** | Status → COMPLETED. Audit: `COMPLETE_REQUIREMENT`. Builder notified. |
| 3 | Attempt on requirement with outstanding PENDING award | Error: "Complete the outstanding award(s) before completing this requirement." |

---

### TC-COMPLETE-02 — Complete a requirement (Admin)

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin completes a CLOSED requirement | Status → COMPLETED. Admin can complete without ownership check. |

---

### TC-COMPLETE-03 — Reopen a requirement

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder 1 clicks **Reopen** on a COMPLETED requirement | Status → REOPENED. Audit: `REOPEN_REQUIREMENT` |
| 2 | Requirement appears back in vendor feed | Vendors can bid again |
| 3 | Attempt to reopen a non-COMPLETED requirement | Error: "Only COMPLETED requirements can be reopened" |
| 4 | Attempt to reopen if project is not ACTIVE | Error: "Reopen the project before reopening its requirements" |

---

### TC-COMPLETE-04 — Complete a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Project has OPEN requirements | — |
| 2 | Builder 1 clicks **Complete Project** | Project → COMPLETED. All OPEN/REOPENED requirements cascade → CLOSED. Audit for each. |
| 3 | Attempt with outstanding awards (PENDING/BROKERED) | Error: "Complete the outstanding award(s) on this project's requirements before completing it." |

---

### TC-COMPLETE-05 — Reopen a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder 1 reopens a COMPLETED project | Status → ACTIVE. Audit: `REOPEN_PROJECT` |
| 2 | CLOSED requirements remain CLOSED (only project re-activated) | Requirements need separate reopen action |
| 3 | Attempt to reopen non-COMPLETED project | Error: "Only COMPLETED projects can be reopened" |

---

### TC-COMPLETE-06 — Archive a project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Archive an ACTIVE project | Project → ARCHIVED. Live requirements cascade → CLOSED. |
| 2 | Attempt to archive a DRAFT project | Error: "Activate the project before archiving" |
| 3 | Attempt to add requirement to ARCHIVED project | Error: "Cannot add requirements to an archived project" |
| 4 | Attempt to edit ARCHIVED project | Error: "Cannot edit an archived project" |
| 5 | Attempt to archive with outstanding awards | Error: blocked until awards resolved |

---

## Module 9: File Uploads

### TC-UPLOAD-01 — Authenticated upload

| Step | Action | Expected Result |
|---|---|---|
| 1 | As verified Builder 1, POST to `/api/uploads` with `multipart/form-data; file=<image>` | Returns `{ storagePath: "requirements/uuid.ext" }` with status 201 |
| 2 | File is stored in S3/R2 under `requirements/` prefix | No original filename or metadata preserved |

---

### TC-UPLOAD-02 — Unauthenticated upload

| Step | Action | Expected Result |
|---|---|---|
| 1 | POST to `/api/uploads` without session cookie | `401 Unauthenticated` |

---

### TC-UPLOAD-03 — Unauthorized role (Admin)

| Step | Action | Expected Result |
|---|---|---|
| 1 | As Admin, POST to `/api/uploads` | `403 Unauthorized` (Admin role not allowed) |

---

### TC-UPLOAD-04 — PENDING user cannot upload

| Step | Action | Expected Result |
|---|---|---|
| 1 | As PENDING vendor (valid session), POST to `/api/uploads` | `403 Your account must be verified before you can upload files` |

---

### TC-UPLOAD-05 — Rate limiting

| Step | Action | Expected Result |
|---|---|---|
| 1 | As verified user, send 21 upload requests within 60 seconds | 21st request returns `429 Too many uploads. Try again in Xs.` |

---

## Module 10: Notifications

### TC-NOTIF-01 — Notification visibility

| Step | Action | Expected Result |
|---|---|---|
| 1 | Trigger a bid submission | Admin sees NEW_BID notification |
| 2 | Admin awards a requirement | Builder sees REQUIREMENT_AWARDED, selected vendors see BID_SELECTED, others see BID_NOT_SELECTED |
| 3 | Admin completes an award | Builder + vendor each see AWARD_COMPLETED |
| 4 | Admin verifies a user | That user sees USER_VERIFIED notification |
| 5 | Admin approves vendor category | Vendor sees CATEGORY_APPROVED |

---

### TC-NOTIF-02 — Role isolation

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `/vendor/notifications` as Builder | Redirected / 403 |
| 2 | Navigate to `/builder/notifications` as Vendor | Redirected / 403 |
| 3 | Navigate to `/admin/notifications` as Builder | Redirected / 403 |

---

## Module 11: Audit Log

### TC-AUDIT-01 — Admin can view audit log

| Step | Action | Expected Result |
|---|---|---|
| 1 | Admin navigates to `/admin/audit` | Full audit log with actor, action, entity, timestamp |
| 2 | Audit shows entries for: CREATE_USER, CREATE_PROFILE, VERIFY_USER, CREATE_PROJECT, PUBLISH_REQUIREMENT, BID_SUBMITTED, AWARD_REQUIREMENT, etc. | All entries present after completing earlier test cases |

---

### TC-AUDIT-02 — Non-admin cannot access audit log

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `/admin/audit` as Builder | Redirected to `/login` or `/builder` |
| 2 | Navigate to `/admin/audit` as Vendor | Redirected to `/login` or `/vendor` |

---

## Module 12: RBAC & Security Tests

### TC-SEC-01 — Cross-ownership: Builder cannot act on another Builder's project

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder 2 directly calls `activateProject` with Builder 1's project ID | Error: "Forbidden" / "Unauthorized" |
| 2 | Builder 2 directly calls `createRequirement` for Builder 1's project | Error: Ownership check fails |
| 3 | Builder 2 directly calls `completeRequirement` on Builder 1's requirement | Error: Ownership check fails |

---

### TC-SEC-02 — Vendor cannot access builder routes

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 navigates to `/builder/projects` | Redirected to `/vendor` or `/login` |
| 2 | Vendor 1 calls `createProject` server action | Error: "Unauthorized" (role check) |
| 3 | Vendor 1 calls `publishRequirement` | Error: Unauthorized |

---

### TC-SEC-03 — Builder cannot access vendor routes

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder 1 navigates to `/vendor/feed` | Redirected to `/builder` or `/login` |
| 2 | Builder 1 calls `submitBid` | Error: "Unauthorized" |
| 3 | Builder 1 calls `getVendorFeed` | Error: "Unauthorized" |

---

### TC-SEC-04 — Builder cannot access admin routes

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder navigates to `/admin` | Redirected to `/login` |
| 2 | Builder calls `verifyUser` | Error: "Unauthorized" |
| 3 | Builder calls `selectBids` | Error: "Unauthorized" |
| 4 | Builder calls `createFormTemplate` | Error: "Unauthorized" |

---

### TC-SEC-05 — Anonymity: vendor payload never exposes builder identity

| Step | Action | Expected Result |
|---|---|---|
| 1 | Vendor 1 calls `getVendorFeed` | Response JSON contains no `project`, no `builderId`, no builder profile fields |
| 2 | Vendor 1 calls `getVendorRequirement` | Response contains only fields where `visibleToVendor=true` |
| 3 | `site_contact` field is NOT in response | Serializer strips non-vendor-visible fields at server level |
| 4 | BID_SELECTED notification payload has no builder name/phone/project | Only `requirementId`, `anonCode`, `category` |

---

### TC-SEC-06 — Anonymity: builder payload never exposes vendor identity

| Step | Action | Expected Result |
|---|---|---|
| 1 | Builder calls `getRequirement` | No vendor names, bid amounts, or vendor phone numbers in response |
| 2 | REQUIREMENT_AWARDED notification payload | Only `requirementId`, `anonCode` — no vendor info |

---

### TC-SEC-07 — Rate limiting: login

| Step | Action | Expected Result |
|---|---|---|
| 1 | Submit the login form 11 times in under 60 seconds from same IP | 11th attempt returns: "Too many sign-in attempts. Try again in Xs." |

---

### TC-SEC-08 — Rate limiting: bid submission

| Step | Action | Expected Result |
|---|---|---|
| 1 | Submit 31 bid write operations within 60 seconds as same vendor | 31st returns: "Too many bid submissions. Try again in Xs." |

---

## Module 13: State Machine Validation Summary

Verify that invalid transitions are always rejected:

| Entity | Invalid Transition | Expected Error |
|---|---|---|
| User | VERIFIED → VERIFIED | "Cannot verify a user with status VERIFIED" |
| User | SUSPENDED → REJECTED | Not allowed (no path) |
| Project | DRAFT → COMPLETED | "Only ACTIVE projects can be completed" |
| Project | ACTIVE → DRAFT | No action available |
| Project | ARCHIVED → ACTIVE | "Only COMPLETED projects can be reopened" |
| Requirement | OPEN → DRAFT | Not possible |
| Requirement | COMPLETED → OPEN | "Only COMPLETED requirements can be reopened" (→ REOPENED) |
| Requirement | AWARDED → OPEN | Only OPEN/REOPENED can be awarded |
| Bid | WITHDRAWN → SELECTED | Vendor must re-submit first |
| Bid | SELECTED → SUBMITTED | Cannot edit after admin selection |
| Award | PENDING → COMPLETED | Must go PENDING → BROKERED → COMPLETED |
| Award | BROKERED → PENDING | No rollback path |

---

## Module 14: Health Check

### TC-HEALTH-01

| Step | Action | Expected Result |
|---|---|---|
| 1 | GET `http://localhost:3000/api/health` | `200 OK` with health status response |

---

## Quick Regression Checklist

Use this after any code change:

- [ ] Login works with `123456` for all three roles
- [ ] Pending user cannot transact (read-only)  
- [ ] Builder cannot see vendor data / admin data
- [ ] Vendor feed shows only `visibleToVendor=true` fields
- [ ] Admin sees full identity on both sides in requirement detail
- [ ] Creating a requirement pins the schema snapshot correctly
- [ ] Bid submitted → Admin notified
- [ ] Award flow: PENDING → BROKERED → COMPLETED with notifications at each step
- [ ] Project cascade-closes OPEN requirements on complete/archive
- [ ] Suspended user is kicked out within ~30s (middleware cache)
- [ ] Audit log entry written for every mutation
- [ ] File uploads only allowed for VERIFIED Builder/Vendor
