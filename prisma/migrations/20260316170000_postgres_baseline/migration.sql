CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "IdeaSource" AS ENUM ('TELEGRAM', 'GITHUB', 'MANUAL', 'SYSTEM');
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'PROCESSED', 'ARCHIVED');
CREATE TYPE "GithubEventType" AS ENUM ('COMMIT', 'PULL_REQUEST', 'ISSUE', 'RELEASE', 'README_UPDATE', 'REPOSITORY');
CREATE TYPE "DraftPlatform" AS ENUM ('X', 'LINKEDIN');
CREATE TYPE "PendingPlatformSelection" AS ENUM ('X', 'LINKEDIN', 'BOTH');
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'POSTED', 'FAILED');
CREATE TYPE "PostJobStatus" AS ENUM ('PENDING', 'READY_FOR_MANUAL_POST', 'PROCESSING', 'POSTED', 'FAILED');
CREATE TYPE "FeedbackAction" AS ENUM ('APPROVED', 'REJECTED', 'REWRITTEN_SHORTER', 'REWRITTEN_SHARPER', 'REWRITTEN_MORE_PERSONAL', 'EDITED', 'SCHEDULED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT,
  "telegramChatId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "defaultXStylePreset" TEXT,
  "defaultXFormatPreset" TEXT,
  "defaultLinkedInStylePreset" TEXT,
  "defaultLinkedInFormatPreset" TEXT,
  "pendingIdeaId" TEXT,
  "pendingPlatformSelection" "PendingPlatformSelection",
  "pendingStylePreset" TEXT,
  "pendingFormatPreset" TEXT,
  "pendingGenerationNote" TEXT,
  "awaitingGenerationNote" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Idea" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "source" "IdeaSource" NOT NULL,
  "rawContent" TEXT NOT NULL,
  "normalizedContent" TEXT,
  "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GithubEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "repoName" TEXT NOT NULL,
  "eventType" "GithubEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "eventTimestamp" TIMESTAMP(3) NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GithubEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Draft" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "platform" "DraftPlatform" NOT NULL,
  "content" TEXT NOT NULL,
  "stylePreset" TEXT,
  "formatPreset" TEXT,
  "generationNote" TEXT,
  "sourceIdeaId" TEXT,
  "sourceGithubEventId" TEXT,
  "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
  "qualityScore" DOUBLE PRECISION,
  "scheduledFor" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostJob" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "platform" "DraftPlatform" NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "PostJobStatus" NOT NULL DEFAULT 'PENDING',
  "externalPostId" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PostJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "action" "FeedbackAction" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeedbackEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
CREATE UNIQUE INDEX "GithubEvent_fingerprint_key" ON "GithubEvent"("fingerprint");
CREATE UNIQUE INDEX "PostJob_draftId_key" ON "PostJob"("draftId");

ALTER TABLE "Idea"
ADD CONSTRAINT "Idea_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GithubEvent"
ADD CONSTRAINT "GithubEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Draft"
ADD CONSTRAINT "Draft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Draft"
ADD CONSTRAINT "Draft_sourceIdeaId_fkey"
FOREIGN KEY ("sourceIdeaId") REFERENCES "Idea"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Draft"
ADD CONSTRAINT "Draft_sourceGithubEventId_fkey"
FOREIGN KEY ("sourceGithubEventId") REFERENCES "GithubEvent"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostJob"
ADD CONSTRAINT "PostJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostJob"
ADD CONSTRAINT "PostJob_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "Draft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackEvent"
ADD CONSTRAINT "FeedbackEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackEvent"
ADD CONSTRAINT "FeedbackEvent_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "Draft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
