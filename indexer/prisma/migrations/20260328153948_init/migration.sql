-- CreateTable
CREATE TABLE "IndexedState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "lastSyncedBlock" BIGINT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VaultEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "userAddress" TEXT,
    "amount" TEXT,
    "newRewardRate" TEXT,
    "rawData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserPositionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAddress" TEXT NOT NULL,
    "totalStakedIn" TEXT NOT NULL DEFAULT '0',
    "totalWithdrawn" TEXT NOT NULL DEFAULT '0',
    "totalRewardsPaid" TEXT NOT NULL DEFAULT '0',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "VaultEvent_blockNumber_idx" ON "VaultEvent"("blockNumber");

-- CreateIndex
CREATE INDEX "VaultEvent_transactionHash_idx" ON "VaultEvent"("transactionHash");

-- CreateIndex
CREATE INDEX "VaultEvent_userAddress_idx" ON "VaultEvent"("userAddress");

-- CreateIndex
CREATE INDEX "VaultEvent_eventName_idx" ON "VaultEvent"("eventName");

-- CreateIndex
CREATE UNIQUE INDEX "UserPositionSnapshot_userAddress_key" ON "UserPositionSnapshot"("userAddress");
