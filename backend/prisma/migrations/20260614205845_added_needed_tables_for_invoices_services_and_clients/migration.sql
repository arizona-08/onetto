-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "clientCity" TEXT NOT NULL,
    "clientPostalCode" TEXT NOT NULL,
    "clientCountry" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNumber" TEXT NOT NULL,
    "urlDocumentPdf" TEXT NOT NULL,
    "paymentDueAt" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceService" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "vat" DOUBLE PRECISION,
    "wtPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserService" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "vat" DOUBLE PRECISION,
    "wtPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UserService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserClient" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "UserClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceService" ADD CONSTRAINT "InvoiceService_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserService" ADD CONSTRAINT "UserService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClient" ADD CONSTRAINT "UserClient_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
