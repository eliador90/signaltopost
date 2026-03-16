-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultXStylePreset" TEXT;
ALTER TABLE "User" ADD COLUMN "defaultXFormatPreset" TEXT;
ALTER TABLE "User" ADD COLUMN "defaultLinkedInStylePreset" TEXT;
ALTER TABLE "User" ADD COLUMN "defaultLinkedInFormatPreset" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingIdeaId" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingPlatformSelection" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingStylePreset" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingFormatPreset" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingGenerationNote" TEXT;
ALTER TABLE "User" ADD COLUMN "awaitingGenerationNote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "stylePreset" TEXT;
ALTER TABLE "Draft" ADD COLUMN "formatPreset" TEXT;
ALTER TABLE "Draft" ADD COLUMN "generationNote" TEXT;
