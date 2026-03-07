-- CreateTable
CREATE TABLE "owner_accounts" (
    "owner_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_accounts_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "admin_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "token_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "line_channel_configs" (
    "owner_id" TEXT NOT NULL,
    "channel_access_token" TEXT NOT NULL,
    "channel_secret" TEXT NOT NULL,
    "liff_id" TEXT NOT NULL,
    "webhook_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "line_channel_configs_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "line_friendships" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "followed_at" TIMESTAMP(3) NOT NULL,
    "unfollowed_at" TIMESTAMP(3),

    CONSTRAINT "line_friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "business_hour_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_business_day" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("business_hour_id")
);

-- CreateTable
CREATE TABLE "closed_days" (
    "closed_day_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "closed_days_pkey" PRIMARY KEY ("closed_day_id")
);

-- CreateTable
CREATE TABLE "daily_slot_lists" (
    "daily_slot_list_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_slot_lists_pkey" PRIMARY KEY ("daily_slot_list_id")
);

-- CreateTable
CREATE TABLE "slots" (
    "slot_id" TEXT NOT NULL,
    "daily_slot_list_id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "reservation_id" TEXT,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "reservation_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "date_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "customer_name" TEXT NOT NULL,
    "line_user_id" TEXT,
    "owner_line_user_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("reservation_id")
);

-- CreateTable
CREATE TABLE "reservation_histories" (
    "history_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "previous_date_time" TEXT,
    "new_date_time" TEXT,
    "previous_slot_id" TEXT,
    "new_slot_id" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_histories_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "notification_records" (
    "notification_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message_id" TEXT,
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_records_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "reminder_schedules" (
    "reminder_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reminder_schedules_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "display_name" TEXT,
    "line_user_id" TEXT,
    "is_line_linked" BOOLEAN NOT NULL DEFAULT false,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "google_calendar_integrations" (
    "owner_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "calendar_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disabled',

    CONSTRAINT "google_calendar_integrations_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "calendar_event_mappings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "calendar_event_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_accounts_email_key" ON "owner_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_email_key" ON "admin_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "line_friendships_owner_id_line_user_id_key" ON "line_friendships"("owner_id", "line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_owner_id_day_of_week_key" ON "business_hours"("owner_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "closed_days_owner_id_date_key" ON "closed_days"("owner_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_slot_lists_owner_id_date_key" ON "daily_slot_lists"("owner_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_schedules_reservation_id_key" ON "reminder_schedules"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_owner_id_line_user_id_key" ON "customers"("owner_id", "line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_mappings_owner_id_reservation_id_key" ON "calendar_event_mappings"("owner_id", "reservation_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closed_days" ADD CONSTRAINT "closed_days_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_slot_lists" ADD CONSTRAINT "daily_slot_lists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_daily_slot_list_id_fkey" FOREIGN KEY ("daily_slot_list_id") REFERENCES "daily_slot_lists"("daily_slot_list_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_histories" ADD CONSTRAINT "reservation_histories_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("reservation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_accounts"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;
