-- CreateTable
CREATE TABLE "slot_templates" (
    "slot_template_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "slot_templates_pkey" PRIMARY KEY ("slot_template_id")
);

-- CreateTable
CREATE TABLE "slot_template_entries" (
    "entry_id" TEXT NOT NULL,
    "slot_template_id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "slot_template_entries_pkey" PRIMARY KEY ("entry_id")
);

-- AddForeignKey
ALTER TABLE "slot_template_entries" ADD CONSTRAINT "slot_template_entries_slot_template_id_fkey" FOREIGN KEY ("slot_template_id") REFERENCES "slot_templates"("slot_template_id") ON DELETE CASCADE ON UPDATE CASCADE;
