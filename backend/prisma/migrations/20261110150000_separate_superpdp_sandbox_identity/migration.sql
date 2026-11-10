ALTER TABLE "ElectronicInvoicingConnection"
ADD COLUMN "superPdpSandboxCompanyNumber" TEXT;

-- Only recover an identity actually returned by SuperPDP, never a routing address.
UPDATE "ElectronicInvoicingConnection"
SET "superPdpSandboxCompanyNumber" = "metadata"->>'number'
WHERE "provider" = 'SUPER_PDP'
  AND "environment" = 'SANDBOX'
  AND "metadata"->>'env' = 'sandbox'
  AND "metadata"->>'number_scheme' = 'sandbox'
  AND "metadata"->>'number' ~ '^[0-9]{9}$';

-- Existing tokens must be checked against the expected identity before use.
UPDATE "ElectronicInvoicingConnection"
SET "status" = 'VERIFYING',
    "lastError" = 'Vérifiez l’identité de l’entreprise SuperPDP dans les paramètres.'
WHERE "provider" = 'SUPER_PDP' AND "status" = 'ACTIVE';
