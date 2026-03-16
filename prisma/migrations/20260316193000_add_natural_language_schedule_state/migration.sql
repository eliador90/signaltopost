ALTER TABLE "User"
ADD COLUMN "pendingScheduleDraftId" TEXT;

ALTER TABLE "User"
ADD COLUMN "awaitingScheduleInput" BOOLEAN NOT NULL DEFAULT false;
