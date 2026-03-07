-- DropIndex
DROP INDEX "reservations_customer_id_owner_id_status_idx";

-- CreateIndex
CREATE INDEX "calendar_event_mappings_reservation_id_idx" ON "calendar_event_mappings"("reservation_id");

-- CreateIndex
CREATE INDEX "customers_owner_id_idx" ON "customers"("owner_id");

-- CreateIndex
CREATE INDEX "notification_records_reservation_id_idx" ON "notification_records"("reservation_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_owner_id_idx" ON "password_reset_tokens"("owner_id");

-- CreateIndex
CREATE INDEX "reminder_schedules_is_active_scheduled_at_idx" ON "reminder_schedules"("is_active", "scheduled_at");

-- CreateIndex
CREATE INDEX "reservation_histories_reservation_id_idx" ON "reservation_histories"("reservation_id");

-- CreateIndex
CREATE INDEX "reservations_owner_id_status_date_time_idx" ON "reservations"("owner_id", "status", "date_time");

-- CreateIndex
CREATE INDEX "reservations_customer_id_owner_id_status_date_time_idx" ON "reservations"("customer_id", "owner_id", "status", "date_time");

-- CreateIndex
CREATE INDEX "sessions_owner_id_idx" ON "sessions"("owner_id");

-- CreateIndex
CREATE INDEX "slots_reservation_id_idx" ON "slots"("reservation_id");
