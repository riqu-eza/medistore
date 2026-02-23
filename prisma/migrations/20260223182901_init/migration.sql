-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "image" TEXT,
    "role_id" INTEGER NOT NULL,
    "store_id" UUID,
    "passwordChangedAt" TIMESTAMP(3),
    "lastPasswordChange" TIMESTAMP(3),
    "passwordHistory" JSONB,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_login" TIMESTAMPTZ,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "verification_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "parent_id" INTEGER,
    "is_system" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "code" VARCHAR(50),
    "parent_id" INTEGER,
    "category_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "drug_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "id" UUID NOT NULL,
    "drug_code" VARCHAR(50) NOT NULL,
    "generic_name" VARCHAR(255) NOT NULL,
    "brand_name" VARCHAR(255),
    "category_id" INTEGER NOT NULL,
    "dosage_form" VARCHAR(100) NOT NULL,
    "strength" VARCHAR(100) NOT NULL,
    "pack_size" INTEGER NOT NULL,
    "unit_of_measure" VARCHAR(50) NOT NULL,
    "storage_requirements" JSONB,
    "storage_condition_group" VARCHAR(50),
    "regulatory_class" VARCHAR(50) NOT NULL,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "controlled_schedule" VARCHAR(20),
    "manufacturer" VARCHAR(255),
    "active_ingredients" JSONB,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "unit_cost" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2),
    "reorder_point" INTEGER,
    "reorder_quantity" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "discontinued_date" TIMESTAMPTZ,
    "discontinued_reason" TEXT,
    "replacement_drug_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "company_type" VARCHAR(50) NOT NULL,
    "contact_person" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "alternate_phone" VARCHAR(20),
    "website" VARCHAR(255),
    "address" JSONB NOT NULL,
    "license_number" VARCHAR(100),
    "license_expiry" TIMESTAMPTZ,
    "tax_id" VARCHAR(50),
    "bank_details" JSONB,
    "rating" DECIMAL(3,2),
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "on_time_delivery_rate" DECIMAL(5,2),
    "quality_score" DECIMAL(5,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_drugs" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "supplier_drug_code" VARCHAR(50),
    "lead_time_days" INTEGER,
    "minimum_order_qty" INTEGER,
    "unit_cost" DECIMAL(10,2),
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "issue_date" TIMESTAMPTZ,
    "expiry_date" TIMESTAMPTZ,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "store_type" VARCHAR(50) NOT NULL,
    "temperature_min" DECIMAL(5,2),
    "temperature_max" DECIMAL(5,2),
    "humidity_min" DECIMAL(5,2),
    "humidity_max" DECIMAL(5,2),
    "total_capacity" DECIMAL(10,2),
    "current_utilization" DECIMAL(5,2),
    "allowed_drug_types" JSONB,
    "allows_controlled" BOOLEAN NOT NULL DEFAULT false,
    "allows_dispatch" BOOLEAN NOT NULL DEFAULT true,
    "is_receiving_zone" BOOLEAN NOT NULL DEFAULT false,
    "address" JSONB,
    "parent_store_id" UUID,
    "manager_id" UUID,
    "operating_hours" JSONB,
    "temperature_sensor_id" VARCHAR(100),
    "humidity_sensor_id" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperature_logs" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "temperature" DECIMAL(5,2) NOT NULL,
    "humidity" DECIMAL(5,2),
    "is_alert" BOOLEAN NOT NULL DEFAULT false,
    "alert_reason" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensor_id" VARCHAR(100),

    CONSTRAINT "temperature_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "batch_number" VARCHAR(100) NOT NULL,
    "drug_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "grn_id" UUID NOT NULL,
    "manufacturing_date" TIMESTAMPTZ NOT NULL,
    "expiry_date" TIMESTAMPTZ NOT NULL,
    "received_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_quantity" DECIMAL(10,2) NOT NULL,
    "unit_type" VARCHAR(50) NOT NULL,
    "pack_size" INTEGER,
    "total_pieces" DECIMAL(10,2),
    "current_store_id" UUID,
    "quality_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "inspection_notes" TEXT,
    "inspection_date" TIMESTAMPTZ,
    "inspected_by" UUID,
    "parent_batch_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "status_changed_at" TIMESTAMPTZ,
    "status_changed_by" UUID,
    "status_reason" TEXT,
    "is_recalled" BOOLEAN NOT NULL DEFAULT false,
    "recall_date" TIMESTAMPTZ,
    "recall_reason" TEXT,
    "recall_level" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_notes" (
    "id" UUID NOT NULL,
    "grn_number" VARCHAR(50) NOT NULL,
    "supplier_id" UUID NOT NULL,
    "purchase_order_ref" VARCHAR(100),
    "delivery_note_ref" VARCHAR(100),
    "invoice_ref" VARCHAR(100),
    "received_date" TIMESTAMPTZ NOT NULL,
    "received_by" UUID NOT NULL,
    "vehicle_number" VARCHAR(50),
    "driver_name" VARCHAR(255),
    "driver_phone" VARCHAR(20),
    "delivery_temperature" DECIMAL(5,2),
    "temperature_compliant" BOOLEAN,
    "packaging_intact" BOOLEAN,
    "labels_legible" BOOLEAN,
    "documents_complete" BOOLEAN,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_value" DECIMAL(12,2),
    "photo_urls" JSONB,
    "document_urls" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "goods_receipt_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" UUID NOT NULL,
    "grn_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "batch_number" VARCHAR(100) NOT NULL,
    "manufacturing_date" TIMESTAMPTZ NOT NULL,
    "expiry_date" TIMESTAMPTZ NOT NULL,
    "ordered_quantity" DECIMAL(10,2),
    "received_quantity" DECIMAL(10,2) NOT NULL,
    "rejected_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "accepted_quantity" DECIMAL(10,2) NOT NULL,
    "unit_type" VARCHAR(50) NOT NULL,
    "pack_size" INTEGER,
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(12,2),
    "inspection_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "inspection_notes" TEXT,
    "has_damage" BOOLEAN NOT NULL DEFAULT false,
    "damage_description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "available_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMPTZ NOT NULL,
    "days_to_expiry" INTEGER,
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "is_near_expiry" BOOLEAN NOT NULL,
    "is_low_stock" BOOLEAN NOT NULL DEFAULT false,
    "last_movement_date" TIMESTAMPTZ,
    "last_movement_type" VARCHAR(50),
    "last_updated" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drug_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "quantity_in" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity_out" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "performed_by" UUID NOT NULL,
    "reference_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_facility" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "shipping_address" JSONB NOT NULL,
    "delivery_date" TIMESTAMPTZ NOT NULL,
    "delivery_instructions" TEXT,
    "order_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "order_type" VARCHAR(50) NOT NULL DEFAULT 'regular',
    "source_store_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "allocated_at" TIMESTAMPTZ,
    "dispatched_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_value" DECIMAL(12,2),
    "is_partial_fulfillment" BOOLEAN NOT NULL DEFAULT false,
    "has_backorder" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "requested_quantity" DECIMAL(10,2) NOT NULL,
    "allocated_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dispatched_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "backorder_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2),
    "total_price" DECIMAL(12,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_allocations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "allocated_quantity" DECIMAL(10,2) NOT NULL,
    "allocated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocated_by" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'reserved',
    "released_at" TIMESTAMPTZ,
    "release_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_notes" (
    "id" UUID NOT NULL,
    "dispatch_number" VARCHAR(50) NOT NULL,
    "order_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "dispatch_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_by" UUID NOT NULL,
    "driver_name" VARCHAR(255),
    "vehicle_number" VARCHAR(50),
    "driver_phone" VARCHAR(20),
    "temperature_at_dispatch" DECIMAL(5,2),
    "packaging_verified" BOOLEAN,
    "labels_verified" BOOLEAN,
    "documentation_complete" BOOLEAN,
    "status" VARCHAR(50) NOT NULL DEFAULT 'prepared',
    "delivered_at" TIMESTAMPTZ,
    "received_by" VARCHAR(255),
    "signature_url" VARCHAR(500),
    "proof_of_delivery_url" VARCHAR(500),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "document_urls" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dispatch_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" UUID NOT NULL,
    "dispatch_note_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "quantity_dispatched" DECIMAL(10,2) NOT NULL,
    "picked_by" UUID,
    "picked_at" TIMESTAMPTZ,
    "quality_checked" BOOLEAN,
    "quality_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfers" (
    "id" UUID NOT NULL,
    "transfer_number" VARCHAR(50) NOT NULL,
    "from_store_id" UUID NOT NULL,
    "to_store_id" UUID NOT NULL,
    "transfer_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transfer_type" VARCHAR(50) NOT NULL DEFAULT 'inter_store',
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "dispatched_at" TIMESTAMPTZ,
    "received_by" UUID,
    "received_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_items" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "requested_quantity" DECIMAL(10,2) NOT NULL,
    "transferred_quantity" DECIMAL(10,2),
    "received_quantity" DECIMAL(10,2),
    "has_discrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" UUID NOT NULL,
    "adjustment_number" VARCHAR(50) NOT NULL,
    "store_id" UUID NOT NULL,
    "adjustment_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjustment_type" VARCHAR(50) NOT NULL,
    "performed_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "document_urls" JSONB,
    "photo_urls" JSONB,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_variance" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_items" (
    "id" UUID NOT NULL,
    "adjustment_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "system_quantity" DECIMAL(10,2) NOT NULL,
    "physical_quantity" DECIMAL(10,2) NOT NULL,
    "variance_quantity" DECIMAL(10,2) NOT NULL,
    "variance_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "adjustment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "data" JSONB,
    "action_url" VARCHAR(500),
    "action_label" VARCHAR(100),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "channels" JSONB,
    "email_sent" BOOLEAN,
    "sms_sent" BOOLEAN,
    "push_sent" BOOLEAN,
    "scheduled_for" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "data_type" VARCHAR(50) NOT NULL,
    "is_system" BOOLEAN NOT NULL,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_store_id_idx" ON "users"("store_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_is_active_idx" ON "roles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "drug_categories_name_key" ON "drug_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "drug_categories_code_key" ON "drug_categories"("code");

-- CreateIndex
CREATE INDEX "drug_categories_category_type_idx" ON "drug_categories"("category_type");

-- CreateIndex
CREATE INDEX "drug_categories_is_active_idx" ON "drug_categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "drugs_drug_code_key" ON "drugs"("drug_code");

-- CreateIndex
CREATE INDEX "drugs_drug_code_idx" ON "drugs"("drug_code");

-- CreateIndex
CREATE INDEX "drugs_generic_name_idx" ON "drugs"("generic_name");

-- CreateIndex
CREATE INDEX "drugs_brand_name_idx" ON "drugs"("brand_name");

-- CreateIndex
CREATE INDEX "drugs_category_id_idx" ON "drugs"("category_id");

-- CreateIndex
CREATE INDEX "drugs_status_idx" ON "drugs"("status");

-- CreateIndex
CREATE INDEX "drugs_is_controlled_idx" ON "drugs"("is_controlled");

-- CreateIndex
CREATE INDEX "drugs_storage_condition_group_idx" ON "drugs"("storage_condition_group");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_code_idx" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "supplier_drugs_supplier_id_idx" ON "supplier_drugs"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_drugs_drug_id_idx" ON "supplier_drugs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_drugs_supplier_id_drug_id_key" ON "supplier_drugs"("supplier_id", "drug_id");

-- CreateIndex
CREATE INDEX "supplier_documents_supplier_id_idx" ON "supplier_documents"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_documents_document_type_idx" ON "supplier_documents"("document_type");

-- CreateIndex
CREATE INDEX "supplier_documents_expiry_date_idx" ON "supplier_documents"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "stores_code_idx" ON "stores"("code");

-- CreateIndex
CREATE INDEX "stores_store_type_idx" ON "stores"("store_type");

-- CreateIndex
CREATE INDEX "stores_is_active_idx" ON "stores"("is_active");

-- CreateIndex
CREATE INDEX "stores_is_receiving_zone_idx" ON "stores"("is_receiving_zone");

-- CreateIndex
CREATE INDEX "temperature_logs_store_id_recorded_at_idx" ON "temperature_logs"("store_id", "recorded_at");

-- CreateIndex
CREATE INDEX "temperature_logs_is_alert_idx" ON "temperature_logs"("is_alert");

-- CreateIndex
CREATE INDEX "batches_batch_number_idx" ON "batches"("batch_number");

-- CreateIndex
CREATE INDEX "batches_drug_id_idx" ON "batches"("drug_id");

-- CreateIndex
CREATE INDEX "batches_supplier_id_idx" ON "batches"("supplier_id");

-- CreateIndex
CREATE INDEX "batches_grn_id_idx" ON "batches"("grn_id");

-- CreateIndex
CREATE INDEX "batches_expiry_date_idx" ON "batches"("expiry_date");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "batches_is_recalled_idx" ON "batches"("is_recalled");

-- CreateIndex
CREATE INDEX "batches_current_store_id_idx" ON "batches"("current_store_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_number_drug_id_supplier_id_key" ON "batches"("batch_number", "drug_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_notes_grn_number_key" ON "goods_receipt_notes"("grn_number");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_grn_number_idx" ON "goods_receipt_notes"("grn_number");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_supplier_id_idx" ON "goods_receipt_notes"("supplier_id");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_status_idx" ON "goods_receipt_notes"("status");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_received_date_idx" ON "goods_receipt_notes"("received_date");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_received_by_idx" ON "goods_receipt_notes"("received_by");

-- CreateIndex
CREATE INDEX "grn_items_grn_id_idx" ON "grn_items"("grn_id");

-- CreateIndex
CREATE INDEX "grn_items_drug_id_idx" ON "grn_items"("drug_id");

-- CreateIndex
CREATE INDEX "grn_items_batch_number_idx" ON "grn_items"("batch_number");

-- CreateIndex
CREATE INDEX "grn_items_expiry_date_idx" ON "grn_items"("expiry_date");

-- CreateIndex
CREATE INDEX "inventory_store_id_idx" ON "inventory"("store_id");

-- CreateIndex
CREATE INDEX "inventory_drug_id_idx" ON "inventory"("drug_id");

-- CreateIndex
CREATE INDEX "inventory_batch_id_idx" ON "inventory"("batch_id");

-- CreateIndex
CREATE INDEX "inventory_expiry_date_idx" ON "inventory"("expiry_date");

-- CreateIndex
CREATE INDEX "inventory_is_expired_idx" ON "inventory"("is_expired");

-- CreateIndex
CREATE INDEX "inventory_is_near_expiry_idx" ON "inventory"("is_near_expiry");

-- CreateIndex
CREATE INDEX "inventory_available_quantity_idx" ON "inventory"("available_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_drug_id_batch_id_store_id_key" ON "inventory"("drug_id", "batch_id", "store_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_timestamp_idx" ON "inventory_ledger"("timestamp");

-- CreateIndex
CREATE INDEX "inventory_ledger_drug_id_batch_id_store_id_idx" ON "inventory_ledger"("drug_id", "batch_id", "store_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_action_type_idx" ON "inventory_ledger"("action_type");

-- CreateIndex
CREATE INDEX "inventory_ledger_reference_type_reference_id_idx" ON "inventory_ledger"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_performed_by_idx" ON "inventory_ledger"("performed_by");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_priority_idx" ON "orders"("priority");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "orders"("order_date");

-- CreateIndex
CREATE INDEX "orders_delivery_date_idx" ON "orders"("delivery_date");

-- CreateIndex
CREATE INDEX "orders_created_by_idx" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "orders_customer_name_idx" ON "orders"("customer_name");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_drug_id_idx" ON "order_items"("drug_id");

-- CreateIndex
CREATE INDEX "order_items_status_idx" ON "order_items"("status");

-- CreateIndex
CREATE INDEX "order_allocations_order_item_id_idx" ON "order_allocations"("order_item_id");

-- CreateIndex
CREATE INDEX "order_allocations_batch_id_idx" ON "order_allocations"("batch_id");

-- CreateIndex
CREATE INDEX "order_allocations_store_id_idx" ON "order_allocations"("store_id");

-- CreateIndex
CREATE INDEX "order_allocations_status_idx" ON "order_allocations"("status");

-- CreateIndex
CREATE INDEX "order_allocations_allocated_at_idx" ON "order_allocations"("allocated_at");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_notes_dispatch_number_key" ON "dispatch_notes"("dispatch_number");

-- CreateIndex
CREATE INDEX "dispatch_notes_dispatch_number_idx" ON "dispatch_notes"("dispatch_number");

-- CreateIndex
CREATE INDEX "dispatch_notes_order_id_idx" ON "dispatch_notes"("order_id");

-- CreateIndex
CREATE INDEX "dispatch_notes_store_id_idx" ON "dispatch_notes"("store_id");

-- CreateIndex
CREATE INDEX "dispatch_notes_status_idx" ON "dispatch_notes"("status");

-- CreateIndex
CREATE INDEX "dispatch_notes_dispatch_date_idx" ON "dispatch_notes"("dispatch_date");

-- CreateIndex
CREATE INDEX "dispatch_items_dispatch_note_id_idx" ON "dispatch_items"("dispatch_note_id");

-- CreateIndex
CREATE INDEX "dispatch_items_order_item_id_idx" ON "dispatch_items"("order_item_id");

-- CreateIndex
CREATE INDEX "dispatch_items_batch_id_idx" ON "dispatch_items"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transfers_transfer_number_key" ON "inventory_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "inventory_transfers_transfer_number_idx" ON "inventory_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "inventory_transfers_from_store_id_idx" ON "inventory_transfers"("from_store_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_to_store_id_idx" ON "inventory_transfers"("to_store_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_status_idx" ON "inventory_transfers"("status");

-- CreateIndex
CREATE INDEX "inventory_transfers_transfer_date_idx" ON "inventory_transfers"("transfer_date");

-- CreateIndex
CREATE INDEX "transfer_items_transfer_id_idx" ON "transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "transfer_items_drug_id_idx" ON "transfer_items"("drug_id");

-- CreateIndex
CREATE INDEX "transfer_items_batch_id_idx" ON "transfer_items"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustments_adjustment_number_key" ON "inventory_adjustments"("adjustment_number");

-- CreateIndex
CREATE INDEX "inventory_adjustments_adjustment_number_idx" ON "inventory_adjustments"("adjustment_number");

-- CreateIndex
CREATE INDEX "inventory_adjustments_store_id_idx" ON "inventory_adjustments"("store_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_status_idx" ON "inventory_adjustments"("status");

-- CreateIndex
CREATE INDEX "inventory_adjustments_adjustment_type_idx" ON "inventory_adjustments"("adjustment_type");

-- CreateIndex
CREATE INDEX "inventory_adjustments_adjustment_date_idx" ON "inventory_adjustments"("adjustment_date");

-- CreateIndex
CREATE INDEX "adjustment_items_adjustment_id_idx" ON "adjustment_items"("adjustment_id");

-- CreateIndex
CREATE INDEX "adjustment_items_drug_id_idx" ON "adjustment_items"("drug_id");

-- CreateIndex
CREATE INDEX "adjustment_items_batch_id_idx" ON "adjustment_items"("batch_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_idx" ON "notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- CreateIndex
CREATE INDEX "system_configurations_category_idx" ON "system_configurations"("category");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_categories" ADD CONSTRAINT "drug_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "drug_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_drugs" ADD CONSTRAINT "supplier_drugs_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_drugs" ADD CONSTRAINT "supplier_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_current_store_id_fkey" FOREIGN KEY ("current_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_store_id_fkey" FOREIGN KEY ("source_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_allocated_by_fkey" FOREIGN KEY ("allocated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_dispatch_by_fkey" FOREIGN KEY ("dispatch_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatch_note_id_fkey" FOREIGN KEY ("dispatch_note_id") REFERENCES "dispatch_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_store_id_fkey" FOREIGN KEY ("from_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_store_id_fkey" FOREIGN KEY ("to_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "inventory_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
