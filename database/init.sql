-- Database Schema: Pill Dispenser System (Volumetric & IoT Optimized)
-- Target: PostgreSQL / drawDB

-- 1. Core Identity Tables
CREATE TABLE "patients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tax_id" text UNIQUE NOT NULL,
  "full_name" text NOT NULL,
  "birth_date" date,
  "phone" text,
  "email" text
);

CREATE TABLE "caregivers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tax_id" text UNIQUE NOT NULL,
  "full_name" text NOT NULL,
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
  "patient_id" uuid NOT NULL REFERENCES "patients" ("id"),
  "is_online" boolean DEFAULT false,
  "last_sync" timestamp
);

CREATE TABLE "drawers" (
  "id" serial PRIMARY KEY,
  "dispenser_id" uuid NOT NULL REFERENCES "dispensers" ("id"),
  "label" text
);

CREATE TABLE "slots" (
  "id" serial PRIMARY KEY,
  "drawer_id" integer NOT NULL REFERENCES "drawers" ("id"),
  "medication_id" integer,
  "position_number" integer NOT NULL,
  "max_pill_capacity" integer NOT NULL,
  "current_pill_count" integer DEFAULT 0
);

-- 3. Clinical Data & Rules
CREATE TABLE "medications" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "dosage_mg" decimal,
  "description" text
);

CREATE TABLE "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot_id" integer NOT NULL REFERENCES "slots" ("id"),
  "medication_id" integer NOT NULL REFERENCES "medications" ("id"),
  "scheduled_time" time NOT NULL, -- Daily recurring time
  "pills_per_dose" integer DEFAULT 1,
  "is_active" boolean DEFAULT true
);

-- 4. Event Logging (History)
CREATE TABLE "dispensation_logs" (
  "id" bigserial PRIMARY KEY,
  "slot_id" integer NOT NULL REFERENCES "slots" ("id"),
  "medication_name_snapshot" text,
  "pills_dispensed" integer,
  "scheduled_time_reference" timestamp NOT NULL,
  "actual_execution_time" timestamp,
  "status" text, -- e.g., 'success', 'empty_slot', 'missed'
  "caregiver_notified" boolean DEFAULT false
);

CREATE TABLE "refill_history" (
  "id" serial PRIMARY KEY,
  "slot_id" integer NOT NULL REFERENCES "slots" ("id"),
  "caregiver_id" uuid NOT NULL REFERENCES "caregivers" ("id"),
  "quantity_added" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 6. Performance & Search Indexes
CREATE INDEX "idx_slots_drawer" ON "slots" ("drawer_id");
CREATE INDEX "idx_dispensation_date" ON "dispensation_logs" ("actual_execution_time");
CREATE INDEX "idx_active_schedules" ON "schedules" ("is_active", "scheduled_time");
