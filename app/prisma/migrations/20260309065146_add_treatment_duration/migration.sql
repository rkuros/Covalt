-- AlterTable
ALTER TABLE "owner_settings" ADD COLUMN     "default_treatment_minutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "slots" ADD COLUMN     "treatment_duration_minutes" INTEGER;
