CREATE TYPE "AppUserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

ALTER TABLE "User"
ADD COLUMN "appUserRolle" "AppUserRole" NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "appUserRolle" = 'ADMIN'
WHERE "isAdmin" = true;

ALTER TABLE "User" DROP COLUMN "isAdmin";
