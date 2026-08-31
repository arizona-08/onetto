-- Each catalog item and document line independently identifies whether it is
-- a good or a service. Existing entries preserve the historical behaviour.
CREATE TYPE "ElectronicInvoiceLineItemType" AS ENUM ('GOODS', 'SERVICES');

ALTER TABLE "CompanyService"
  ADD COLUMN "itemType" "ElectronicInvoiceLineItemType" NOT NULL DEFAULT 'SERVICES';

ALTER TABLE "DocumentService"
  ADD COLUMN "itemType" "ElectronicInvoiceLineItemType" NOT NULL DEFAULT 'SERVICES';
