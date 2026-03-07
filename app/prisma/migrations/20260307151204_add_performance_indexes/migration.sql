-- CreateIndex
CREATE INDEX "reservations_owner_id_date_time_idx" ON "reservations"("owner_id", "date_time");

-- CreateIndex
CREATE INDEX "reservations_owner_id_status_idx" ON "reservations"("owner_id", "status");

-- CreateIndex
CREATE INDEX "reservations_customer_id_owner_id_status_idx" ON "reservations"("customer_id", "owner_id", "status");

-- CreateIndex
CREATE INDEX "slot_templates_owner_id_idx" ON "slot_templates"("owner_id");

-- CreateIndex
CREATE INDEX "slots_daily_slot_list_id_idx" ON "slots"("daily_slot_list_id");
