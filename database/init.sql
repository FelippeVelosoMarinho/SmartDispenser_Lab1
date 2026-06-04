-- Database Schema: Pill Dispenser System (Volumetric & IoT Optimized)
-- Target: PostgreSQL / drawDB

-- 1. Core Identity Tables
CREATE TABLE "patients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tax_id" text UNIQUE,
  "full_name" text NOT NULL,
  "birth_date" date,
  "phone" text,
  "email" text,
  "name" text,
  "age" integer,
  "condition" text,
  "caregiver_username" text
);

CREATE TABLE "caregivers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text UNIQUE NOT NULL,
  "hashed_password" text NOT NULL,
  "tax_id" text UNIQUE,
  "full_name" text,
  "email" text UNIQUE,
  "notifications_enabled" boolean DEFAULT true
);

-- Relationship: Many-to-Many between Patients and Caregivers
CREATE TABLE "patient_caregiver" (
  "patient_id" uuid REFERENCES "patients" ("id"),
  "caregiver_id" uuid REFERENCES "caregivers" ("id"),
  "relationship_tag" text, -- e.g., 'Primary', 'Nurse', 'Son'
  PRIMARY KEY ("patient_id", "caregiver_id")
);

-- 2. Hardware Hierarchy
CREATE TABLE "dispensers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "hardware_id" text UNIQUE NOT NULL, -- MAC Address or Serial
  "patient_id" uuid REFERENCES "patients" ("id"),
  "is_online" boolean DEFAULT false,
  "last_sync" timestamp,
  "battery_level" numeric DEFAULT 100.0,
  "critical_stock" boolean DEFAULT false
);

CREATE TABLE "drawers" (
  "id" serial PRIMARY KEY,
  "dispenser_id" uuid NOT NULL REFERENCES "dispensers" ("id"),
  "label" text
);

CREATE TABLE "slots" (
  "id" serial PRIMARY KEY,
  "drawer_id" integer NOT NULL REFERENCES "drawers" ("id"),
  "position_number" integer NOT NULL,
  "max_pill_capacity" integer NOT NULL
);

-- 3. Clinical Data & Rules
CREATE TABLE "medications" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "dosage" text,
  "description" text
);

CREATE TABLE "slot_medications" (
  "slot_id" integer REFERENCES "slots" ("id") ON DELETE CASCADE,
  "medication_id" integer REFERENCES "medications" ("id"),
  "quantity" integer DEFAULT 0,
  PRIMARY KEY ("slot_id", "medication_id")
);

CREATE TABLE "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot_id" integer REFERENCES "slots" ("id"),
  "scheduled_time" time,
  "scheduled_at" timestamp,
  "is_active" boolean DEFAULT true,
  "patient_id" uuid,
  "dispenser_id" text,
  "time_legacy" text,
  "last_triggered_at" timestamp
);

-- 4. Event Logging (History)
CREATE TABLE "dispensation_logs" (
  "id" serial PRIMARY KEY,
  "slot_id" integer REFERENCES "slots" ("id"),
  "medication_name_snapshot" text,
  "pills_dispensed" integer,
  "scheduled_time_reference" timestamp,
  "actual_execution_time" timestamp,
  "status" text,
  "caregiver_notified" boolean DEFAULT false,
  "schedule_id_legacy" text,
  "patient_id_legacy" text,
  "dispenser_id_legacy" text,
  "medication_id_legacy" text,
  "success" boolean,
  "error_message" text
);

CREATE TABLE "refill_history" (
  "id" serial PRIMARY KEY,
  "slot_id" integer REFERENCES "slots" ("id"),
  "caregiver_id" uuid REFERENCES "caregivers" ("id"),
  "quantity_added" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "dispenser_id_legacy" text,
  "medication_id_legacy" text,
  "performed_by_legacy" text
);

-- 6. Performance & Search Indexes
CREATE INDEX "idx_slots_drawer" ON "slots" ("drawer_id");
CREATE INDEX "idx_dispensation_date" ON "dispensation_logs" ("actual_execution_time");
CREATE INDEX "idx_active_schedules" ON "schedules" ("is_active", "scheduled_time");
