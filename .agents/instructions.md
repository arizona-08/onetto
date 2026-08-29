# Onetto — Instructions for Codex

## 0. Source of truth

Onetto is an existing SaaS application. The **current repository and its Prisma schema are the source of truth**.

The instructions below are aligned with the current Prisma schema, including these main models and enums:

- `User`
- `UserSubscription`
- `UserSubscriptionHistory`
- `Company`
- `CompanyUser`
- `CompanyPaymentAccount`
- `CompanyPaymentOAuthState`
- `Document`
- `EstimateNegociation`
- `InvoicePaymentMode`
- `InvoicePublicAccess`
- `InvoicePaymentLink`
- `PayByBankPayment`
- `PayByBankPaymentAttempt`
- `InvoiceInstalmentPlan`
- `InvoicePaymentInstalment`
- `ProcessedWebhookEvents`
- `ProcessedStripeWebhookEvents`
- `ProcessedReminders`
- `ProcessedInstalmentReminder`
- `CompanyService`
- `CompanyClient`
- `DocumentService`

Before modifying any feature:

1. inspect the current Prisma schema;
2. inspect affected NestJS services/controllers/DTOs;
3. inspect affected Next.js pages/components/hooks;
4. inspect existing tests;
5. reuse current naming and relations;
6. avoid creating duplicate domain models.

If repository code has evolved since this file was written, preserve the latest coherent implementation unless the task explicitly requires a change.

---

# 1. Product overview

Onetto is a lightweight SaaS for artisans and small businesses focused on:

- client management;
- reusable services/prestations;
- quotes;
- quote negotiation;
- quote → invoice conversion;
- invoices;
- secure public document access;
- Pay by Bank;
- payment in 2 or 3 instalments;
- automatic reminders;
- subscriptions;
- dashboards and business metrics;
- future French electronic invoicing through an external Plateforme Agréée.

Main stack:

- Frontend: **Next.js**
- Backend: **NestJS**
- ORM: **Prisma**
- Database: **PostgreSQL**
- Onetto subscription billing: **Stripe**
- Customer payments: **GoCardless**
- Secondary Pay by Bank provider kept for Adapter demonstration: **Bridge**
- Future electronic invoicing: external **Plateforme Agréée**

The application is maintained primarily by a solo developer. Favor clarity and low operational complexity.

---

# 2. General engineering principles

When working on Onetto:

1. Inspect before modifying.
2. Reuse existing architecture.
3. Prefer explicit business concepts over generic abstractions.
4. Avoid over-engineering.
5. Do not refactor unrelated code.
6. Keep controllers thin.
7. Keep business rules inside NestJS services.
8. The backend is the source of truth for authorization and subscription restrictions.
9. Frontend restrictions are UX only.
10. Do not assume provider webhook order.
11. Keep webhook processing idempotent.
12. Avoid duplicating derived state unless there is a real query/performance reason.
13. Do not introduce CQRS, event sourcing, a workflow engine, BullMQ, Redis, queues, or a full hexagonal architecture unless explicitly required.
14. Do not rename existing Prisma models simply to match an abstract naming convention.
15. Add focused tests for business-critical changes.
16. Use transactions when several persistence operations form one atomic business operation.
17. Do not silently change existing financial rules.

Before coding, provide a short plan.

After coding, report:
- modified files;
- migrations;
- tests added/changed;
- commands executed;
- assumptions;
- remaining TODOs.

---

# 3. Current User model and account types

Current model:

```prisma
model User {
  id                     String           @id @default(uuid())
  firstname              String
  lastname               String
  email                  String           @unique
  password               String
  accountType            AccountType      @default(BUSINESS_OWNER)
  subscriptionPlan       SubscriptionPlan?
  lastConnectedCompanyId String?

  lastConnectedCompany   Company?                   @relation("LastConnectedCompany", fields: [lastConnectedCompanyId], references: [id])
  ownedCompanies         Company[]
  companies              CompanyUser[]
  subscription           UserSubscription?
  subscriptionHistory    UserSubscriptionHistory[]
}
```

Current enum:

```prisma
enum AccountType {
  BUSINESS_OWNER
  EMPLOYEE
}
```

## BUSINESS_OWNER

A business-owner account:

- may own one or more `Company`;
- owns an Onetto subscription;
- may create companies according to subscription limits;
- must not be invited into another owner's company as an employee/admin.

## EMPLOYEE

An employee account:

- must not own companies;
- does not need a personal Onetto subscription;
- works through `CompanyUser`;
- benefits from the subscription of the owner of the company.

Do not introduce a second user table for employees.

---

# 4. User subscription model

Current models:

```prisma
model UserSubscription {
  id                     String           @id @default(uuid())
  userId                 String           @unique
  user                   User             @relation(fields: [userId], references: [id])
  customerId             String?          @unique
  subscriptionId         String?
  subscriptionPlan       SubscriptionPlan @default(FREE)
  isActive               Boolean          @default(true)
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt
  canceledAtPeriodEnd    DateTime?
  willCancelAtPeriodEnd  Boolean          @default(false)
}
```

```prisma
model UserSubscriptionHistory {
  id               String           @id @default(uuid())
  userId           String
  user             User             @relation(fields: [userId], references: [id])
  createdAt        DateTime         @default(now())
  subscriptionPlan SubscriptionPlan
}
```

Current plans:

```prisma
enum SubscriptionPlan {
  FREE
  STARTER_MONTHLY
  STARTER_YEARLY
  PRO_MONTHLY
  PRO_YEARLY
}
```

## Important

Do not invent a separate `STARTER` / `PRO` enum in Prisma unless explicitly requested.

When checking feature access, normalize monthly/yearly variants conceptually:

```text
STARTER_MONTHLY
STARTER_YEARLY
    ↓
STARTER capabilities
```

```text
PRO_MONTHLY
PRO_YEARLY
    ↓
PRO capabilities
```

Prefer a small helper/service rather than scattering checks.

Example conceptual helpers:

```ts
isStarterPlan(plan)
isProPlan(plan)
getPlanTier(plan)
canUseFeature(plan, feature)
```

Use existing helpers if already present.

---

# 5. Subscription ownership model

The subscription belongs to the **business-owner User**.

The owner subscription applies to all companies where:

```text
Company.ownerId = user.id
```

Employees/admins do not need subscriptions.

Feature resolution for a company must conceptually be:

```text
Company
  ↓
ownerId
  ↓
User
  ↓
UserSubscription / subscriptionPlan
  ↓
effective plan
```

Do not use the authenticated employee's own subscription to determine company features.

---

# 6. Company model

Current model includes:

```prisma
model Company {
  id                        String        @id @default(uuid())
  ownerId                   String
  name                      String
  email                     String        @unique
  phoneNumber               String        @unique
  siren                     String        @unique
  siret                     String        @unique
  address                   String
  city                      String
  postalCode                String
  country                   String
  subjectToVat              Boolean
  vatNumber                 String?
  IBAN                      String
  BIC                       String
  status                    CompanyStatus @default(ACTIVE)
  closingReason             String?
  closedAt                  DateTime?
  isPaymentAccountConnected Boolean       @default(false)

  documents                 Document[]
  owner                     User          @relation(fields: [ownerId], references: [id])
  companyUsers              CompanyUser[]
  lastConnectedUsers        User[]        @relation("LastConnectedCompany")
  services                  CompanyService[]
  clients                   CompanyClient[]
  companyPaymentAccount     CompanyPaymentAccount?
  companyPaymentOAuthStates CompanyPaymentOAuthState[]
}
```

The owner is explicitly represented by `Company.ownerId`.

Do not add an `OWNER` value to `CompanyUserRole` merely to represent ownership: ownership already exists through `ownerId`.

This is important.

---

# 7. CompanyUser roles

Current enum:

```prisma
enum CompanyUserRole {
  ADMIN
  ACCOUNTANT
  EMPLOYEE
}
```

Current model:

```prisma
model CompanyUser {
  id        String          @id @default(uuid())
  companyId String
  userId    String
  role      CompanyUserRole
  isHidden  Boolean         @default(false)

  company Company @relation(fields: [companyId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([companyId, userId])
}
```

Do not invent `OWNER` in `CompanyUserRole`.

Ownership is represented by:

```text
Company.ownerId
```

Roles in `CompanyUser` apply only to collaborators.

## Business rules

A `BUSINESS_OWNER`:
- may own companies;
- must not be added to another company's `CompanyUser`.

An `EMPLOYEE`:
- may appear in `CompanyUser`;
- may have `ADMIN`, `ACCOUNTANT`, or `EMPLOYEE` role;
- must not own a company.

When inviting a collaborator:
- reject an existing user whose `accountType = BUSINESS_OWNER`;
- do not convert account type automatically.

---

# 8. Subscription tiers and feature rules

Keep access rules centralized.

Suggested conceptual feature map:

```ts
const PLAN_FEATURES = {
  FREE: {
    maxOwnedCompanies: 1,
    quoteNegotiation: false,
    automaticReminders: false,
    instalments: false,
    advancedAnalytics: false,
    cashForecast: false,
  },

  STARTER: {
    maxOwnedCompanies: 1,
    quoteNegotiation: true,
    automaticReminders: true,
    instalments: false,
    advancedAnalytics: false,
    cashForecast: false,
  },

  PRO: {
    maxOwnedCompanies: 3,
    quoteNegotiation: true,
    automaticReminders: true,
    instalments: true,
    advancedAnalytics: true,
    cashForecast: true,
  },
};
```

Monthly/yearly Prisma variants map to these tiers.

Do not hard-code entitlement logic in many unrelated services.

---

# 9. FREE plan

Free includes:

- 1 owned company;
- unlimited `CompanyClient`;
- unlimited `CompanyService`;
- unlimited quotes;
- unlimited invoices;
- quote → invoice conversion;
- simple quote accept/reject;
- document tracking;
- Pay by Bank;
- secure public document access;
- essential dashboard;
- future electronic invoicing through the external Plateforme Agréée.

Free excludes:

- `EstimateNegociation`;
- automatic reminders;
- Instalments;
- advanced analytics;
- collection forecasts;
- multiple owned companies beyond 1.

---

# 10. STARTER plans

Both:

```text
STARTER_MONTHLY
STARTER_YEARLY
```

share the same functional entitlement.

Starter includes Free plus:

- quote negotiation;
- automatic reminders;
- optional advanced document customization if already present.

Starter remains limited to:

```text
maxOwnedCompanies = 1
```

Starter does not include Instalments or advanced financial analytics.

---

# 11. PRO plans

Both:

```text
PRO_MONTHLY
PRO_YEARLY
```

share Pro capabilities.

Pro includes everything in Starter plus:

- up to 3 owned companies;
- 2x/3x Instalments;
- advanced analytics;
- expected-collection forecasts;
- multi-company dashboard/filtering where useful.

---

# 12. Stripe synchronization

Current Stripe-related fields live in `UserSubscription`:

- `customerId`
- `subscriptionId`
- `subscriptionPlan`
- `isActive`
- `canceledAtPeriodEnd`
- `willCancelAtPeriodEnd`

And webhook idempotency uses:

```prisma
model ProcessedStripeWebhookEvents {
  id              String   @id @default(uuid())
  providerEventId String
  processedAt     DateTime @default(now())

  @@unique([providerEventId])
}
```

Reuse this model.

Do not introduce another Stripe webhook-processing table.

Relevant Stripe webhooks:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Stripe principles

- webhook events can arrive out of order;
- handlers must be idempotent;
- mark/process `ProcessedStripeWebhookEvents` consistently;
- when necessary, retrieve the current Stripe subscription before syncing;
- Stripe controls billing;
- Onetto local subscription data controls feature access.

## Cancellation

Do not immediately downgrade an active subscription simply because cancellation is scheduled.

Existing fields:

```text
canceledAtPeriodEnd
willCancelAtPeriodEnd
```

must reflect the actual Stripe semantics used by the current integration.

If the subscription remains active until a future `cancel_at`, paid features remain available until effective cancellation.

---

# 13. Unified Document model

Onetto currently uses one model for both quotes and invoices:

```prisma
model Document {
  id                     String       @id @default(uuid())
  type                   DocumentType @default(ESTIMATE)
  companyId              String

  clientName             String
  clientEmail            String
  clientAddress          String
  clientCity             String
  clientPostalCode       String
  clientCountry          String

  totalPriceExcludingTax Float
  totalPrice             Float

  createdAt              DateTime     @default(now())
  sentAt                 DateTime?
  documentNumber         String?

  versionNumber          Int          @default(1)
  isLastVersion          Boolean      @default(true)
  isFromEstimate         Boolean?     @default(true)

  sourceDocumentId       String?
  sourceDocument         Document?    @relation("DocumentConversion", fields: [sourceDocumentId], references: [id], onDelete: Restrict)
  convertedDocuments     Document[]   @relation("DocumentConversion")

  urlDocumentPdf         String?

  answerDueAt            DateTime?    @default(now())
  paymentDueAt           DateTime

  invoiceStatus          InvoiceStatus  @default(DRAFT)
  estimateStatus         EstimateStatus @default(DRAFT)

  company                Company      @relation(fields: [companyId], references: [id], onDelete: Restrict)
  services               DocumentService[]
  negociations           EstimateNegociation[]
  invoicePaymentLinks    InvoicePaymentLink[]
  payByBankPayments      PayByBankPayment[]
  invoiceInstalmentPlan  InvoiceInstalmentPlan?
  invoicePaymentMode     InvoicePaymentMode?
  invoicePublicAccess    InvoicePublicAccess?
  processedReminders     ProcessedReminders[]

  @@unique([companyId, documentNumber, versionNumber])
}
```

## Important

Do not introduce separate `Invoice` and `Estimate` Prisma models unless explicitly requested.

Use:

```prisma
enum DocumentType {
  ESTIMATE
  INVOICE
}
```

All code should respect the unified `Document` model.

---

# 14. Document statuses

Current invoice statuses:

```prisma
enum InvoiceStatus {
  DRAFT
  PENDING
  PAYMENT_IN_PROGRESS
  PAID
  PARTIALLY_PAID
  PAID_MANUALLY
  OVERDUE
  REJECTED
}
```

Current estimate statuses:

```prisma
enum EstimateStatus {
  DRAFT
  SENT
  ACCEPTED
  SUPERSEDED
  REJECTED
}
```

Do not invent a second payment-status field on `Document` unless explicitly required.

Reuse these states consistently.

Avoid moving backwards from terminal states unless the existing business rules explicitly support it.

---

# 15. Document versioning and conversion

Current fields:

- `versionNumber`
- `isLastVersion`
- `sourceDocumentId`
- `sourceDocument`
- `convertedDocuments`
- `isFromEstimate`

Preserve this architecture.

Quote → invoice conversion should use the current self-relation instead of creating an unrelated conversion table.

Issued historical versions must remain auditable.

---

# 16. Quote negotiation

Current model:

```prisma
model EstimateNegociation {
  id                 String                    @id @default(uuid())
  documentId         String
  message            String
  proposedTotalPrice Float
  createdAt          DateTime                  @default(now())
  negociationToken   String                    @unique
  status             EstimateNegociationStatus @default(PENDING)

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}
```

Current statuses:

```prisma
enum EstimateNegociationStatus {
  PENDING
  ACCEPTED
  RENEGOCIATED
  REJECTED
}
```

Use the existing spelling `Negociation` in code unless an explicit refactor is requested.

Negotiation is available only to Starter and Pro.

Free still supports simple quote acceptance/rejection.

---

# 17. Payment mode

Current model:

```prisma
model InvoicePaymentMode {
  id                         String                @id @default(uuid())
  invoiceId                  String                @unique
  paymentMode                PaymentMode           @default(ONE_TIME)
  paymentModeFrequency       PaymentModeFrequency?
  numberOfInstalments        Int?
  amountPerInstalmentInCents Int?

  invoice Document @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}
```

Current enums:

```prisma
enum PaymentMode {
  ONE_TIME
  INSTALMENTS
}
```

```prisma
enum PaymentModeFrequency {
  WEEKLY
  MONTHLY
  YEARLY
}
```

For the current V1 product direction, Instalments are primarily monthly 2x/3x unless a task explicitly expands frequencies.

Do not add a new payment-mode table.

---

# 18. Money representation

The schema currently mixes:

- `Float` for document/service pricing;
- `Int` in cents for payment provider flows.

Examples:

```text
Document.totalPrice
Document.totalPriceExcludingTax
DocumentService.unitPrice
```

use `Float`.

Payment models use:

```text
amountInCents
totalAmountInCents
amountPerInstalmentInCents
```

Use the existing representation within each workflow.

Do not perform provider payment arithmetic with floating-point numbers.

For payment splitting:
- calculate in integer cents;
- guarantee the sum exactly matches `totalAmountInCents`;
- allocate remainder cents deterministically.

Do not globally migrate all money fields unless explicitly requested.

---

# 19. Public invoice access

Current model:

```prisma
model InvoicePublicAccess {
  id                   String             @id @default(uuid())
  invoiceId            String             @unique
  invoicePaymentLinkId String             @unique
  invoicePaymentLink   InvoicePaymentLink @relation(fields: [invoicePaymentLinkId], references: [id], onDelete: Cascade)
  accessToken          String             @unique
  expiresAt            DateTime
  invoice              Document           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}
```

The product direction is that public invoice access should remain conceptually independent from payment provider logic.

However, the current schema still requires `invoicePaymentLinkId`.

Do not casually remove this relation in unrelated tasks.

If a task specifically addresses public-access decoupling:
- explain the current coupling;
- propose the migration explicitly;
- preserve existing URLs/tokens if possible.

---

# 20. Legacy InvoicePaymentLink

Current model:

```prisma
model InvoicePaymentLink {
  id                String                   @id @default(uuid())
  invoiceId         String
  invoice           Document                 @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  url               String
  provider          PaymentProvider          @default(BRIDGE)
  providerReference String                   @unique
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt
  linkStatus        InvoicePaymentLinkStatus? @default(VALID)
  publicAccess      InvoicePublicAccess?
  payByBankPayments PayByBankPayment[]
}
```

This model is part of the older Bridge-oriented architecture.

Do not automatically build new GoCardless Instalments behavior around it.

Do not delete it in unrelated tasks because public access and legacy Pay by Bank relations still use it.

Treat migrations away from it as explicit refactors.

---

# 21. Pay by Bank model

Current model:

```prisma
model PayByBankPayment {
  id                   String               @id @default(uuid())
  invoiceId            String
  invoice              Document             @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoicePaymentLinkId String?
  invoicePaymentLink   InvoicePaymentLink?  @relation(fields: [invoicePaymentLinkId], references: [id], onDelete: Cascade)

  amountInCents        Int
  provider             PaymentProvider      @default(BRIDGE)
  providerReference    String               @unique
  status               InvoicePaymentStatus @default(PENDING)

  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  payByBankPaymentAttempts PayByBankPaymentAttempt[]
}
```

Current providers:

```prisma
enum PaymentProvider {
  BRIDGE
  GOCARDLESS
}
```

Pay by Bank should stay common enough for Bridge and GoCardless.

Do not create provider-specific Pay by Bank domain models unless required.

---

# 22. Pay by Bank attempts

Current model:

```prisma
model PayByBankPaymentAttempt {
  id                   String                       @id @default(uuid())
  payByBankPaymentId   String
  payByBankPayment     PayByBankPayment             @relation(fields: [payByBankPaymentId], references: [id], onDelete: Cascade)

  providerReference    String                       @unique
  providerPaymentId    String
  paymentStatus        InvoicePaymentAttemptStatus? @default(PENDING)
  failureReason        String?

  createdAt            DateTime                     @default(now())
  updatedAt            DateTime                     @updatedAt

  @@unique([providerReference, providerPaymentId])
}
```

Current statuses:

```prisma
enum InvoicePaymentAttemptStatus {
  PENDING
  PAYMENT_IN_PROGRESS
  SUCCESS
  FAILED
}
```

Use:
- `providerReference` for the provider-side setup/session/Billing Request reference according to current integration;
- `providerPaymentId` for the provider's actual financial payment/transaction reference.

Do not mark a Pay by Bank attempt `SUCCESS` from GoCardless Billing Request fulfillment alone.

---

# 23. GoCardless Billing Request rule

A GoCardless Billing Request is setup/authorization state, not financial state.

Conceptually:

```text
BillingRequest fulfilled
    ↓
Payment exists
    ↓
retrieve current Payment
    ↓
map Payment state
    ↓
PayByBankPaymentAttempt
    ↓
PayByBankPayment / Document status
```

Financial success must be driven by `payments` resources.

---

# 24. GoCardless webhook idempotency

Current model:

```prisma
model ProcessedWebhookEvents {
  id              String          @id @default(uuid())
  provider        PaymentProvider
  providerEventId String
  processedAt     DateTime        @default(now())

  @@unique([provider, providerEventId])
}
```

Reuse this for Bridge/GoCardless provider-event idempotency.

Do not create parallel processed-event tables for each payment provider unless explicitly requested.

When GoCardless sends multiple events in one webhook:
- isolate errors per event in the parent dispatcher;
- one unknown/unrelated event must not unnecessarily block later valid events.

---

# 25. GoCardless payment event routing

GoCardless `payments` events can belong to:

- Pay by Bank;
- an `InvoiceInstalmentPlan`.

Therefore:

```text
No PayByBankPayment found
```

is not automatically an error.

Determine ownership of the provider payment.

Conceptually:

```text
GoCardless Payment event
    ↓
providerPaymentId
    ↓
PayByBankPaymentAttempt?
    ├── yes → Pay by Bank sync
    └── no
         ↓
InvoicePaymentInstalment?
    ├── yes → Instalment sync
    └── no → unknown/log according to webhook strategy
```

Use current GoCardless docs when modifying provider-resource resolution.

---

# 26. Instalment plan model

Current model:

```prisma
model InvoiceInstalmentPlan {
  id                         String   @id @default(uuid())
  invoiceId                  String   @unique
  totalAmountInCents         Int
  numberOfInstalments        Int
  amountPerInstalmentInCents Int
  startDate                  DateTime @default(now())
  authorizationDeadline      DateTime
  providerReference          String   @unique
  providerScheduledId        String?
  providerMandateId          String?
  isCompleted                Boolean  @default(false)

  invoice                    Document                    @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoicePaymentInstalments  InvoicePaymentInstalment[]
}
```

Do not rename it to `InstalmentPlan` unless explicitly requested.

## Semantics

- `totalAmountInCents`: total expected amount.
- `numberOfInstalments`: expected count.
- `amountPerInstalmentInCents`: current baseline amount.
- `startDate`: plan schedule starting point according to current implementation.
- `authorizationDeadline`: deadline for client mandate/setup authorization.
- `providerReference`: provider-side setup reference currently used by the integration.
- `providerScheduledId`: provider schedule ID.
- `providerMandateId`: provider mandate ID.
- `isCompleted`: business completion flag.

Review existing services before changing semantics.

---

# 27. Instalment model

Current model:

```prisma
model InvoicePaymentInstalment {
  id                      String                          @id @default(uuid())
  invoiceInstalmentPlanId String
  invoiceInstalmentPlan   InvoiceInstalmentPlan          @relation(fields: [invoiceInstalmentPlanId], references: [id], onDelete: Cascade)

  providerPaymentId       String?                         @unique
  instalmentNumber        Int
  amountInCents           Int
  dueDate                 DateTime
  instalmentStatus        InvoicePaymentInstalmentStatus @default(PENDING)
  paidAt                  DateTime?

  processedReminders      ProcessedInstalmentReminder[]

  @@unique([invoiceInstalmentPlanId, instalmentNumber])
}
```

Statuses:

```prisma
enum InvoicePaymentInstalmentStatus {
  PENDING
  PAYMENT_IN_PROGRESS
  SUCCESS
  FAILED
  OVERDUE
}
```

Each row is a real Onetto business instalment.

Do not derive business instalments by simply copying GoCardless payments after the fact.

---

# 28. Instalment business workflow

When an invoice is configured with:

```text
paymentMode = INSTALMENTS
```

create the Onetto instalment schedule as part of the invoice business flow.

Conceptually:

```text
Invoice Document
    ↓
InvoicePaymentMode
    ↓
InvoiceInstalmentPlan
    ↓
InvoicePaymentInstalment x2/x3
```

The artisan chooses:
- 2 or 3 instalments;
- first instalment date.

Subsequent due dates should normally use calendar-month increments.

The sum must always equal `totalAmountInCents`.

Do not create GoCardless provider resources at simple draft creation unless current product flow explicitly requires it.

---

# 29. Due-date semantics

Current `Document` has:

```text
answerDueAt
paymentDueAt
```

Use them according to existing document logic.

For instalment invoices, do not make `paymentDueAt` silently mean "mandate authorization deadline" unless the existing code explicitly defines it that way.

The dedicated field already exists:

```text
InvoiceInstalmentPlan.authorizationDeadline
```

Use that for mandate setup reminders.

Individual instalment payment dates belong to:

```text
InvoicePaymentInstalment.dueDate
```

---

# 30. Instalment reminder semantics

Before the mandate/schedule is active:

```text
authorizationDeadline
```

drives mandate setup reminders.

After schedule activation:
- stop mandate reminders;
- use individual `InvoicePaymentInstalment` statuses/due dates.

Do not tell the customer:
> The whole invoice is overdue

when only:
- mandate setup is missing;
- one instalment failed;
- one instalment is overdue.

---

# 31. Automatic reminder models

Current document reminder model:

```prisma
model ProcessedReminders {
  id           String       @id @default(uuid())
  documentId   String
  document     Document     @relation(fields: [documentId], references: [id])
  reminderType ReminderType
  processedAt  DateTime     @default(now())

  @@unique([documentId, reminderType])
}
```

Current instalment reminder model:

```prisma
model ProcessedInstalmentReminder {
  id           String                    @id @default(uuid())
  instalmentId String
  instalment   InvoicePaymentInstalment @relation(fields: [instalmentId], references: [id], onDelete: Cascade)
  reminderType ReminderType
  processedAt  DateTime                  @default(now())

  @@unique([instalmentId, reminderType])
}
```

Current reminder enum:

```prisma
enum ReminderType {
  ESTIMATE_PENDING
  ESTIMATE_PENDING_BEFORE_DUE_DATE
  INVOICE_BEFORE_DUE_DATE
  INVOICE_OVERDUE_FIRST
  INVOICE_OVERDUE_SECOND
  INSTALMENT_MANDATE_AFTER_ISSUE
  INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE
  INSTALMENT_PAYMENT_OVERDUE
}
```

Reuse these models/enums.

Do not create a generic reminder table unless explicitly requested.

---

# 32. Automatic reminder behavior

Automatic reminders are available only to Starter and Pro tiers.

The daily cron should:

```text
Cron
  ↓
AutomaticReminderService
  ↓
eligible documents/plans/instalments
  ↓
resolve company owner subscription
  ↓
verify automaticReminders entitlement
  ↓
check processed reminder table
  ↓
send email
  ↓
persist processed reminder
```

The cron itself must remain thin.

Do not create one cron per invoice.

---

# 33. Document reminder rules

For estimates:
- use `answerDueAt`;
- apply existing estimate reminder types.

For one-time invoices:
- use `paymentDueAt`;
- use `INVOICE_BEFORE_DUE_DATE`;
- use `INVOICE_OVERDUE_FIRST`;
- use `INVOICE_OVERDUE_SECOND`.

Do not send payment reminders for:
- `PAID`;
- `PAID_MANUALLY`;
- other terminal states where payment is no longer expected.

---

# 34. Instalment reminder rules

Before mandate setup is complete:

Use:
- `INSTALMENT_MANDATE_AFTER_ISSUE`;
- `INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE`.

After mandate/schedule activation:
- stop mandate reminders;
- use `INSTALMENT_PAYMENT_OVERDUE` for the affected instalment.

Persist through `ProcessedInstalmentReminder`.

---

# 35. Company reusable data

Current models:

```prisma
model CompanyService {
  ...
}
```

and:

```prisma
model CompanyClient {
  ...
}
```

These support pre-creation and reuse of client/service information while filling quotes/invoices.

They are available on all plans.

Do not impose arbitrary quotas unless explicitly requested later.

---

# 36. Document line items

Current model:

```prisma
model DocumentService {
  id          String @id @default(uuid())
  documentId  String
  description String
  quantity    Int
  unitPrice   Float
  unit        String
  taxRate     Float?
  wtPrice     Float
  totalPrice  Float

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}
```

Document line items are snapshots of the document's commercial content.

Do not replace them with direct references to `CompanyService` if that would make historical documents change when a reusable service is edited.

---

# 37. Company payment account

Current model:

```prisma
model CompanyPaymentAccount {
  id                 String
  companyId          String @unique
  provider           PaymentProvider
  providerAccountId  String
  accessToken        String
  creditorId         String?
  verificationStatus CompanyPaymentAccountVerificationStatus
}
```

This represents provider connectivity for the company.

Reuse it for provider account configuration.

Do not store customer-payment state here.

---

# 38. Dashboard entitlement

The dashboard should keep the same global shell between plans.

## FREE

Show essential metrics:
- invoiced revenue;
- collected revenue;
- amount remaining;
- overdue invoices/amount;
- pending quotes;
- recent invoices;
- recent quotes;
- recent activity.

## STARTER

Add:
- revenue evolution;
- quote acceptance performance;
- negotiations;
- reminders/action items;
- documents requiring follow-up.

## PRO

Add:
- invoiced vs collected trends;
- expected collections;
- payment-type split;
- instalment indicators;
- average payment delay;
- quote → invoice conversion;
- average invoice value;
- useful top-client metrics;
- period comparisons;
- multi-company filtering where supported.

Only implement metrics that can be computed reliably from the current schema.

---

# 39. UX/UI design vision

Onetto should look:

- professional;
- simple;
- clean;
- modern;
- calm;
- lightweight;
- trustworthy.

Visual inspiration should follow the supplied references:
- modern SaaS invoicing dashboard;
- neutral white/light-gray shell;
- polished tables;
- clean finance KPI cards;
- restrained accent color;
- two-column invoice/quote editor with live preview;
- subtle borders and radius;
- clear forms with high information legibility.

The product must feel like a business tool, not a marketing landing page.

---

# 40. Global layout

Preferred desktop application shell:

```text
┌─────────────┬──────────────────────────────────────┐
│ Sidebar     │ Top bar / page context               │
│             ├──────────────────────────────────────┤
│ Navigation  │                                      │
│             │ Main content                         │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

Sidebar:
- compact;
- light background;
- grouped navigation;
- clearly highlighted active route;
- minimal iconography.

Top bar:
- search only if useful;
- active company selector;
- account/profile;
- context actions.

Avoid unnecessary navigation chrome.

---

# 41. Visual hierarchy

Priority order:

1. page title/context;
2. primary action;
3. high-level KPIs;
4. filters/tabs;
5. main table/form/chart;
6. secondary information.

Do not give every component equal prominence.

One dominant primary action per view whenever possible.

---

# 42. Color usage

Use:
- white as dominant surface;
- subtle gray/off-white for app background;
- dark charcoal for primary text;
- neutral gray for secondary text;
- Onetto brand color sparingly.

Brand color should mainly appear in:
- primary CTA;
- active nav state;
- selected tab;
- links;
- focus states;
- small emphasis.

Avoid giant saturated colored panels.

Statuses should use soft tinted badges.

Suggested semantic direction:
- success/paid: soft green;
- pending: soft amber/yellow;
- warning/overdue: soft red;
- neutral/draft: gray;
- informational/in-progress: restrained blue/purple if consistent with current palette.

Do not rely on color alone.

---

# 43. Typography

Use a modern sans-serif consistent with the current Next.js setup.

Inside authenticated product screens:
- avoid giant marketing typography;
- use compact professional sizes;
- emphasize amounts through weight rather than huge font size.

Suggested hierarchy:
- page title: semibold/bold;
- section title: semibold;
- KPI number: bold;
- body: normal;
- helper/meta text: smaller neutral.

---

# 44. Spacing

Prefer an 8px-based spacing rhythm.

Typical values:
- 8px small gap;
- 12–16px control gap;
- 16–24px card padding;
- 24–32px section spacing.

Keep screens information-dense enough for business use without feeling cramped.

---

# 45. Cards

Cards should use:
- white background;
- subtle neutral border;
- moderate radius;
- minimal shadow.

Do not use heavy shadows, gradients, glassmorphism, or excessive elevation.

KPI cards should be simple and horizontally scannable.

Example:

```text
┌─────────────────┐
│ CA encaissé     │
│ 12 450 €        │
│ +8 % ce mois    │
└─────────────────┘
```

---

# 46. Tables

Tables are a primary UI pattern.

Use:
- minimal borders;
- subtle row separators;
- right-aligned amounts;
- concise status badges;
- search/filter controls above table;
- compact row actions;
- meaningful empty states.

For invoice/quote tables prioritize:
- number/reference;
- client;
- date;
- amount;
- status;
- actions.

Do not expose every database property.

---

# 47. Dashboard layout

Preferred structure inspired by the supplied dashboard:

```text
Header / date / company context

[KPI] [KPI] [KPI] [KPI]

[Main trend/chart] [Secondary metric]

[Main document/action table]

[Optional action/reminder sections]
```

Avoid excessive chart diversity.

Use charts only when they communicate trends better than a number/table.

---

# 48. Quote/invoice editor

For desktop, use a split layout inspired by the supplied invoice editor:

```text
┌────────────────────────────┬────────────────────────────┐
│ Editable form              │ Live preview               │
│                            │                            │
│ Client                     │ Final document appearance  │
│ Document details           │                            │
│ Dates                      │                            │
│ Items                      │                            │
│ Payment configuration      │                            │
│ Notes                      │                            │
│ Actions                    │                            │
└────────────────────────────┴────────────────────────────┘
```

The form side should be the interactive workspace.

The preview side should resemble the generated PDF.

On mobile/tablet:
- stack preview below;
- or provide a preview toggle/drawer.

---

# 49. Form order

For quotes/invoices, prefer:

1. client;
2. document number/status context;
3. issue/answer/payment dates;
4. line items;
5. VAT/tax/discounts where supported;
6. payment mode;
7. payment schedule when Pro Instalments is selected;
8. notes/conditions;
9. totals;
10. save/send/finalize actions.

Do not expose advanced options before core information.

---

# 50. Form controls

Use:
- labels above controls;
- consistent height;
- subtle border;
- strong focus state;
- concise helper text;
- inline validation.

Do not use placeholder-only labels.

Date/currency/select/number inputs should feel like one design system.

---

# 51. Invoice/quote preview

The preview should visually resemble a real professional document.

Include:
- company identity;
- client identity;
- document number;
- issue date;
- due/answer date;
- line-item table;
- subtotal;
- tax;
- total.

Use:
- white document surface;
- light-gray surrounding area;
- subtle border/shadow;
- restrained logo/brand use.

Do not style the preview like a dashboard card.

---

# 52. Payment UI

Keep payment configuration understandable.

For one-time payment:
- clearly show payment mode;
- due date;
- Pay by Bank availability.

For Instalments:
- show `2x` or `3x`;
- first instalment date;
- generated schedule;
- authorization deadline;
- per-instalment amount.

Example:

```text
Paiement en 3 fois

Autorisation avant : 15/09/2026

1. 20/09/2026   333,34 €
2. 20/10/2026   333,33 €
3. 20/11/2026   333,33 €
```

Do not expose provider terminology such as Billing Request or Instalment Schedule to end users.

---

# 53. Subscription upgrade UX

Premium features can remain visible in a restrained locked state.

Examples:

```text
Négociation de devis
Disponible avec Starter
```

```text
Paiement en 2x / 3x
Disponible avec Pro
```

Provide a subtle upgrade CTA.

Do not flood Free screens with locked cards.

The core Free product must still feel complete.

---

# 54. Buttons

Use clear hierarchy.

## Primary
Examples:
- Nouvelle facture
- Nouveau devis
- Envoyer
- Finaliser
- S'abonner

## Secondary
Examples:
- Enregistrer en brouillon
- Prévisualiser
- Configurer

## Tertiary
Examples:
- Ajouter une ligne
- Voir tout
- actions textuelles légères

Avoid multiple equally dominant primary buttons.

---

# 55. Empty states

Use concise business-focused copy.

Example:

```text
Aucune facture pour le moment.

Créez votre première facture pour commencer à suivre vos encaissements.

[Créer une facture]
```

Avoid childish or highly decorative empty states.

---

# 56. Loading and async feedback

Use:
- skeletons for dashboard/table loads;
- local button spinners;
- disabled submit while pending;
- toasts for success;
- inline messages for validation errors.

Avoid full-screen blocking loaders for small actions.

Prevent accidental duplicate submissions.

---

# 57. Responsive behavior

Primary screens must remain usable on smaller widths.

Expected behavior:
- sidebar collapses;
- KPI grid wraps;
- tables can horizontally scroll or adapt;
- editor/preview becomes stacked;
- primary CTA remains accessible;
- filter bars wrap cleanly.

Do not simply scale everything down.

---

# 58. Accessibility

Maintain:
- keyboard navigation;
- visible focus states;
- semantic controls;
- associated input labels;
- sufficient contrast;
- text/tooltips for icon-only actions;
- status information beyond color alone.

Minimalism must not reduce accessibility.

---

# 59. Frontend implementation rules

Before creating a UI component:
1. inspect shared components;
2. inspect Tailwind config/CSS variables/design tokens;
3. inspect button/input/card/table/badge/modal/dropdown primitives;
4. reuse them.

Do not create a second design system.

If Tailwind is used:
- prefer tokens/utilities already in the project;
- extract repeated UI patterns;
- avoid arbitrary one-off values without reason.

---

# 60. Backend subscription enforcement

All premium restrictions must be enforced in NestJS.

Frontend hiding/locking is insufficient.

Examples:

```text
FREE tries EstimateNegociation API
→ reject
```

```text
STARTER tries INSTALMENTS
→ reject
```

```text
FREE owner tries second Company
→ reject
```

```text
PRO owner tries fourth Company
→ reject
```

Return clear business errors rather than generic server errors.

---

# 61. Error handling

Use business-level exceptions for expected restrictions.

Examples:

```text
Cette fonctionnalité nécessite Onetto Pro.
```

```text
Votre offre actuelle permet de posséder une seule entreprise.
```

```text
Cette adresse appartient déjà à un compte propriétaire et ne peut pas être invitée comme collaborateur.
```

Reserve `InternalServerErrorException` for genuine unexpected failures.

---

# 62. External provider principles

For Stripe, GoCardless, Bridge, and future PA integration:

- keep provider SDK calls inside integration services;
- do not expose provider-specific status values everywhere;
- expect retry/webhook duplication;
- store provider IDs necessary for correlation;
- avoid relying on event order;
- synchronize from provider current state where appropriate.

---

# 63. Electronic invoicing

Future architecture:

```text
Document (INVOICE)
    ↓
Onetto electronic invoice integration
    ↓
external Plateforme Agréée
    ↓
French e-invoicing ecosystem
```

Electronic invoicing should be available on all plans.

Do not implement it unless explicitly requested.

When implemented later:
- keep provider transmission state separate from core `Document` status;
- do not pretend Onetto itself is a Plateforme Agréée.

---

# 64. Testing expectations

Prioritize backend tests around:

- `BUSINESS_OWNER` vs `EMPLOYEE`;
- `Company.ownerId` resolution;
- collaborator invitation restrictions;
- subscription tier normalization;
- company ownership limits;
- quote negotiation access;
- automatic reminder access;
- Pay by Bank status updates;
- Billing Request vs Payment semantics;
- webhook idempotency;
- webhook event isolation;
- Instalment splitting/rounding;
- Instalment calendar dates;
- `authorizationDeadline`;
- payment aggregation;
- reminder idempotency;
- Stripe cancellation lifecycle.

Frontend tests should cover critical access/conditional-rendering behavior if a frontend test stack already exists.

Do not introduce a new test framework solely for a small feature.

---

# 65. Codex execution checklist

For every task:

1. Read this file.
2. Read the current Prisma schema.
3. Inspect exact affected modules.
4. Confirm existing naming.
5. Identify entitlement/business rules involved.
6. State a concise plan.
7. Implement the smallest coherent change.
8. Add/adapt focused tests.
9. Run relevant tests/typecheck/lint.
10. Report failures honestly.
11. Summarize modified files and migrations.

Do not silently redesign the application.

Do not create abstractions simply because they look architecturally sophisticated.

Optimize for a codebase that remains understandable six months later by one developer.



# 42. Brand color palette

Use the following colors as the primary visual foundation of Onetto:

- **White:** `#FFFFFF`
- **Primary:** `#454ADE`
- **Application background:** either a very subtle neutral gray or a very light tint derived from `#454ADE`

Preferred background direction:

```text
Main surfaces / cards:
#FFFFFF

Primary actions / active states:
#454ADE

App/page background:
very light neutral gray
or
very pale primary tint
```

Examples of acceptable background tones:

```text
Neutral gray direction:
#F7F7F9
#F8F8FA

Primary-tinted direction:
#F6F6FE
#F4F4FC
#F2F2FB
```

Do not treat these exact light-background examples as mandatory tokens if the project already has a coherent design-token system. The important rule is that the background remains extremely light and visually subordinate to white cards and the primary color.

## Primary color usage

`#454ADE` is the main Onetto accent color.

Use it primarily for:

- primary buttons;
- active navigation;
- selected tabs;
- links;
- focus rings;
- active form controls;
- small chart highlights;
- premium/brand accents where appropriate.

Do not use `#454ADE` as a large page background by default.

Avoid making the interface visually saturated with the primary color.

The visual balance should remain approximately:

```text
White / very light background  → dominant
Neutral text/borders           → structural
#454ADE                        → accent and action
Semantic status colors         → limited contextual use
```

## Derived primary colors

When lighter or darker brand variants are needed, derive them consistently from `#454ADE`.

Use very light tints for:

- selected navigation backgrounds;
- hover states;
- information banners;
- subtle highlighted sections;
- locked/premium feature surfaces.

Use darker variants only when required for:

- hover/pressed primary buttons;
- accessibility contrast;
- stronger emphasis.

Do not introduce unrelated purple/blue shades if a derived variant of `#454ADE` works.

## Buttons

Primary CTA:

```text
background: #454ADE
text: #FFFFFF
```

Hover/pressed state:
- use a slightly darker derived shade;
- preserve sufficient contrast.

Secondary buttons should generally remain:
- white or transparent;
- neutral border;
- dark text;
- optional subtle primary-color hover/focus treatment.

## Sidebar and active navigation

Preferred sidebar:
- white or very light neutral background.

Active item:
- very pale tint derived from `#454ADE`;
- text/icon may use `#454ADE`;
- avoid a large saturated primary rectangle unless the current design system already uses it elegantly.

## Focus states

Interactive focus states should use `#454ADE` or an accessible transparent/tinted derivative.

Focus must remain clearly visible for keyboard users.

## Charts

Use `#454ADE` as the principal chart series when a single dominant data series exists.

For additional series:
- use neutral/derived shades first;
- use semantic colors only when the data meaning justifies them.

Avoid rainbow dashboards.

## Status colors

Status colors remain semantic and do not need to use the primary color.

Suggested direction:

- success / paid → soft green;
- pending → soft amber;
- overdue / error → soft red;
- draft / neutral → gray;
- in-progress / informational → a subtle primary-derived tint where appropriate.

Keep all status fills soft and low-saturation so they coexist cleanly with `#454ADE`.
