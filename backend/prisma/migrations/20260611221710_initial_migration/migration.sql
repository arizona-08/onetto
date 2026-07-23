-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BASIC_USER', 'PREMIUM_USER', 'PRO_USER', 'ADMIN_USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BASIC_USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
