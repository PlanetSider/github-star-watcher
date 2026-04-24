-- CreateTable
CREATE TABLE "StarredRepo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repoId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "starredAt" DATETIME,
    "listMode" TEXT NOT NULL DEFAULT 'none',
    "listReason" TEXT,
    "listedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RepoSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repoId" TEXT NOT NULL,
    "pushedAt" DATETIME,
    "latestReleaseId" TEXT,
    "latestReleaseTag" TEXT,
    "latestReleasePublishedAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepoSnapshot_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "StarredRepo" ("repoId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepoEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repoId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "payloadJson" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverchanNotifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepoEvent_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "StarredRepo" ("repoId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StarredRepo_repoId_key" ON "StarredRepo"("repoId");
CREATE UNIQUE INDEX "StarredRepo_fullName_key" ON "StarredRepo"("fullName");
CREATE INDEX "StarredRepo_listMode_idx" ON "StarredRepo"("listMode");
CREATE INDEX "StarredRepo_owner_idx" ON "StarredRepo"("owner");
CREATE INDEX "StarredRepo_name_idx" ON "StarredRepo"("name");
CREATE INDEX "StarredRepo_fullName_idx" ON "StarredRepo"("fullName");

CREATE UNIQUE INDEX "RepoSnapshot_repoId_key" ON "RepoSnapshot"("repoId");
CREATE INDEX "RepoSnapshot_lastCheckedAt_idx" ON "RepoSnapshot"("lastCheckedAt");

CREATE UNIQUE INDEX "RepoEvent_fingerprint_key" ON "RepoEvent"("fingerprint");
CREATE INDEX "RepoEvent_repoId_detectedAt_idx" ON "RepoEvent"("repoId", "detectedAt");
CREATE INDEX "RepoEvent_eventType_detectedAt_idx" ON "RepoEvent"("eventType", "detectedAt");
CREATE INDEX "RepoEvent_serverchanNotifiedAt_idx" ON "RepoEvent"("serverchanNotifiedAt");
