ALTER TABLE "User"
ADD COLUMN "githubIdeaAutomationEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Idea"
ADD COLUMN "sourceRepoName" TEXT;
