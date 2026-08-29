CREATE TYPE "CompanyVatRegime" AS ENUM ('MONTHLY', 'QUARTERLY', 'SIMPLIFIED', 'VAT_EXEMPTION');
CREATE TYPE "ElectronicInvoiceClientType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'PUBLIC_BODY', 'FOREIGN');
CREATE TYPE "ElectronicInvoiceOperationNature" AS ENUM ('GOODS', 'SERVICES', 'MIXED');
CREATE TYPE "ElectronicInvoicingProvider" AS ENUM ('SUPER_PDP');
CREATE TYPE "ElectronicInvoicingEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');
CREATE TYPE "ElectronicInvoicingConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING_AUTHORIZATION', 'VERIFYING', 'ACTIVE', 'ACTION_REQUIRED', 'SUSPENDED');
CREATE TYPE "ElectronicDirectoryRegistrationStatus" AS ENUM ('UNKNOWN', 'PENDING', 'ACTIVE', 'NOT_REGISTERED');
CREATE TYPE "ElectronicInvoiceFlow" AS ENUM ('B2B_FR', 'B2C_FR', 'B2B_INTERNATIONAL', 'B2G', 'EXEMPT', 'OUT_OF_SCOPE');
CREATE TYPE "ElectronicInvoiceTransmissionStatus" AS ENUM ('PENDING', 'SUBMITTING', 'SUBMITTED', 'SENT', 'DELIVERED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'DISPUTED', 'ON_HOLD', 'COMPLETED', 'REFUSED', 'REJECTED', 'INVALID', 'FAILED');
CREATE TYPE "ElectronicInvoiceEventSource" AS ENUM ('PROVIDER_SYNC', 'WEBHOOK', 'USER_ACTION', 'PAYMENT');
CREATE TYPE "ReceivedElectronicInvoiceStatus" AS ENUM ('AVAILABLE', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'DISPUTED', 'ON_HOLD', 'COMPLETED', 'REFUSED', 'REJECTED');
CREATE TYPE "ElectronicReportingKind" AS ENUM ('TRANSACTION', 'PAYMENT');
CREATE TYPE "ElectronicReportingStatus" AS ENUM ('PENDING', 'SUBMITTING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED');

ALTER TABLE "Company"
  ADD COLUMN "legalForm" TEXT,
  ADD COLUMN "vatRegime" "CompanyVatRegime",
  ADD COLUMN "isVatExempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasVatOnDebits" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Document"
  ADD COLUMN "clientType" "ElectronicInvoiceClientType",
  ADD COLUMN "clientIsVatTaxable" BOOLEAN,
  ADD COLUMN "clientSiren" TEXT,
  ADD COLUMN "clientVatNumber" TEXT,
  ADD COLUMN "clientForeignIdentifier" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "deliveryCity" TEXT,
  ADD COLUMN "deliveryPostalCode" TEXT,
  ADD COLUMN "deliveryCountry" TEXT,
  ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN "operationNature" "ElectronicInvoiceOperationNature",
  ADD COLUMN "isVatExempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "vatExemptionReason" TEXT;

CREATE TABLE "ElectronicInvoicingConnection" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "provider" "ElectronicInvoicingProvider" NOT NULL,
  "environment" "ElectronicInvoicingEnvironment" NOT NULL,
  "providerCompanyId" TEXT,
  "status" "ElectronicInvoicingConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "directoryRegistrationStatus" "ElectronicDirectoryRegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
  "enabledCapabilities" JSONB,
  "connectedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectronicInvoicingConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ElectronicInvoiceTransmission" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "provider" "ElectronicInvoicingProvider" NOT NULL,
  "providerInvoiceId" TEXT,
  "flow" "ElectronicInvoiceFlow" NOT NULL,
  "status" "ElectronicInvoiceTransmissionStatus" NOT NULL DEFAULT 'PENDING',
  "providerStatus" TEXT,
  "submittedFormat" TEXT,
  "documentFingerprint" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectronicInvoiceTransmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ElectronicInvoiceEvent" (
  "id" TEXT NOT NULL,
  "transmissionId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "providerStatus" TEXT NOT NULL,
  "source" "ElectronicInvoiceEventSource" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,
  CONSTRAINT "ElectronicInvoiceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceivedElectronicInvoice" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "provider" "ElectronicInvoicingProvider" NOT NULL,
  "providerInvoiceId" TEXT NOT NULL,
  "supplierSiren" TEXT,
  "supplierName" TEXT,
  "invoiceNumber" TEXT,
  "issuedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "currencyCode" TEXT NOT NULL,
  "totalExcludingTax" DECIMAL(18,4) NOT NULL,
  "totalVat" DECIMAL(18,4) NOT NULL,
  "totalIncludingTax" DECIMAL(18,4) NOT NULL,
  "status" "ReceivedElectronicInvoiceStatus" NOT NULL DEFAULT 'AVAILABLE',
  "providerStatus" TEXT,
  "documentFormat" TEXT,
  "providerDocumentUrl" TEXT,
  "documentFingerprint" TEXT,
  "metadata" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceivedElectronicInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ElectronicReportingSubmission" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "documentId" TEXT,
  "provider" "ElectronicInvoicingProvider" NOT NULL,
  "kind" "ElectronicReportingKind" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "providerReportId" TEXT,
  "status" "ElectronicReportingStatus" NOT NULL DEFAULT 'PENDING',
  "providerStatus" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "payloadFingerprint" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectronicReportingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectronicInvoicingConnection_companyId_key" ON "ElectronicInvoicingConnection"("companyId");
CREATE INDEX "ElectronicInvoicingConnection_provider_environment_status_idx" ON "ElectronicInvoicingConnection"("provider", "environment", "status");
CREATE UNIQUE INDEX "ElectronicInvoiceTransmission_idempotencyKey_key" ON "ElectronicInvoiceTransmission"("idempotencyKey");
CREATE UNIQUE INDEX "ElectronicInvoiceTransmission_documentId_provider_flow_key" ON "ElectronicInvoiceTransmission"("documentId", "provider", "flow");
CREATE UNIQUE INDEX "ElectronicInvoiceTransmission_provider_providerInvoiceId_key" ON "ElectronicInvoiceTransmission"("provider", "providerInvoiceId");
CREATE INDEX "ElectronicInvoiceTransmission_status_lastSyncedAt_idx" ON "ElectronicInvoiceTransmission"("status", "lastSyncedAt");
CREATE UNIQUE INDEX "ElectronicInvoiceEvent_transmissionId_providerEventId_key" ON "ElectronicInvoiceEvent"("transmissionId", "providerEventId");
CREATE INDEX "ElectronicInvoiceEvent_transmissionId_occurredAt_idx" ON "ElectronicInvoiceEvent"("transmissionId", "occurredAt");
CREATE UNIQUE INDEX "ReceivedElectronicInvoice_companyId_provider_providerInvoiceId_key" ON "ReceivedElectronicInvoice"("companyId", "provider", "providerInvoiceId");
CREATE INDEX "ReceivedElectronicInvoice_companyId_status_issuedAt_idx" ON "ReceivedElectronicInvoice"("companyId", "status", "issuedAt");
CREATE UNIQUE INDEX "ElectronicReportingSubmission_idempotencyKey_key" ON "ElectronicReportingSubmission"("idempotencyKey");
CREATE UNIQUE INDEX "ElectronicReportingSubmission_provider_providerReportId_key" ON "ElectronicReportingSubmission"("provider", "providerReportId");
CREATE INDEX "ElectronicReportingSubmission_companyId_kind_periodStart_periodEnd_idx" ON "ElectronicReportingSubmission"("companyId", "kind", "periodStart", "periodEnd");

ALTER TABLE "ElectronicInvoicingConnection" ADD CONSTRAINT "ElectronicInvoicingConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectronicInvoiceTransmission" ADD CONSTRAINT "ElectronicInvoiceTransmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicInvoiceEvent" ADD CONSTRAINT "ElectronicInvoiceEvent_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "ElectronicInvoiceTransmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceivedElectronicInvoice" ADD CONSTRAINT "ReceivedElectronicInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectronicReportingSubmission" ADD CONSTRAINT "ElectronicReportingSubmission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectronicReportingSubmission" ADD CONSTRAINT "ElectronicReportingSubmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
