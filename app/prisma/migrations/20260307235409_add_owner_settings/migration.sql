-- CreateTable
CREATE TABLE "owner_settings" (
    "owner_id" TEXT NOT NULL,
    "cancellation_policy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "owner_settings_pkey" PRIMARY KEY ("owner_id")
);
