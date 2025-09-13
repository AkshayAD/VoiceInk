-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "originalText" TEXT,
    "audioPath" TEXT,
    "duration" REAL,
    "model" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "applicationName" TEXT,
    "applicationPath" TEXT,
    "url" TEXT,
    "enhanced" BOOLEAN NOT NULL DEFAULT false,
    "enhancedBy" TEXT,
    "promptUsed" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PowerModeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appIdentifier" TEXT,
    "urlPattern" TEXT,
    "model" TEXT,
    "autoEnhance" BOOLEAN NOT NULL DEFAULT false,
    "enhancePrompt" TEXT,
    "autoPaste" BOOLEAN NOT NULL DEFAULT true,
    "autoSendEnter" BOOLEAN NOT NULL DEFAULT false,
    "customWords" TEXT,
    "replacements" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Replacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "replacement" TEXT NOT NULL,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transcriptionCount" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" REAL NOT NULL DEFAULT 0,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "enhancedCount" INTEGER NOT NULL DEFAULT 0,
    "applicationUsage" TEXT
);

-- CreateIndex
CREATE INDEX "Transcription_createdAt_idx" ON "Transcription"("createdAt");

-- CreateIndex
CREATE INDEX "Transcription_applicationName_idx" ON "Transcription"("applicationName");

-- CreateIndex
CREATE INDEX "PowerModeConfig_appIdentifier_idx" ON "PowerModeConfig"("appIdentifier");

-- CreateIndex
CREATE INDEX "PowerModeConfig_urlPattern_idx" ON "PowerModeConfig"("urlPattern");

-- CreateIndex
CREATE UNIQUE INDEX "CustomWord_word_key" ON "CustomWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "Replacement_pattern_key" ON "Replacement"("pattern");

-- CreateIndex
CREATE INDEX "AIPrompt_category_idx" ON "AIPrompt"("category");

-- CreateIndex
CREATE INDEX "AIPrompt_usageCount_idx" ON "AIPrompt"("usageCount");

-- CreateIndex
CREATE INDEX "UsageMetrics_date_idx" ON "UsageMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMetrics_date_key" ON "UsageMetrics"("date");
