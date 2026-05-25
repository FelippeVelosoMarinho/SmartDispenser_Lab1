"""DDL migrations applied at startup. Each statement is idempotent."""

from sqlalchemy import text
from sqlalchemy.engine import Engine

# Each entry is (description, SQL). Executed in order every startup; all
# use IF NOT EXISTS / DO NOTHING so re-running is safe.
_MIGRATIONS: list[tuple[str, str]] = [
    # --- users ---
    (
        "users: add notifications_enabled",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;",
    ),
    # --- dispensers ---
    (
        "dispensers: patient_id nullable",
        "ALTER TABLE dispensers ALTER COLUMN patient_id DROP NOT NULL;",
    ),
    (
        "dispensers: add battery_level",
        "ALTER TABLE dispensers ADD COLUMN IF NOT EXISTS battery_level NUMERIC DEFAULT 100.0;",
    ),
    (
        "dispensers: add critical_stock",
        "ALTER TABLE dispensers ADD COLUMN IF NOT EXISTS critical_stock BOOLEAN DEFAULT false;",
    ),
    # --- patients ---
    (
        "patients: tax_id nullable",
        "ALTER TABLE patients ALTER COLUMN tax_id DROP NOT NULL;",
    ),
    (
        "patients: add name",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS name TEXT;",
    ),
    (
        "patients: add age",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;",
    ),
    (
        "patients: add condition",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS condition TEXT;",
    ),
    (
        "patients: add caregiver_username",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS caregiver_username TEXT;",
    ),
    # --- medications ---
    # Rename dosage_mg -> dosage only if the old column still exists
    (
        "medications: rename dosage_mg to dosage",
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='medications' AND column_name='dosage_mg'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='medications' AND column_name='dosage'
            ) THEN
                ALTER TABLE medications RENAME COLUMN dosage_mg TO dosage;
            END IF;
        END $$;
        """,
    ),
    (
        "medications: change dosage type to text",
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='medications' AND column_name='dosage'
                  AND data_type = 'numeric'
            ) THEN
                ALTER TABLE medications ALTER COLUMN dosage TYPE TEXT USING dosage::TEXT;
            END IF;
        END $$;
        """,
    ),
    # --- schedules ---
    (
        "schedules: slot_id nullable",
        "ALTER TABLE schedules ALTER COLUMN slot_id DROP NOT NULL;",
    ),
    (
        "schedules: medication_id nullable",
        "ALTER TABLE schedules ALTER COLUMN medication_id DROP NOT NULL;",
    ),
    (
        "schedules: scheduled_time nullable",
        "ALTER TABLE schedules ALTER COLUMN scheduled_time DROP NOT NULL;",
    ),
    (
        "schedules: add patient_id",
        "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS patient_id UUID;",
    ),
    (
        "schedules: add dispenser_id",
        "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS dispenser_id TEXT;",
    ),
    (
        "schedules: add time_legacy",
        "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS time_legacy TEXT;",
    ),
    # --- dispensation_logs ---
    (
        "dispensation_logs: slot_id nullable",
        "ALTER TABLE dispensation_logs ALTER COLUMN slot_id DROP NOT NULL;",
    ),
    (
        "dispensation_logs: scheduled_time_reference nullable",
        "ALTER TABLE dispensation_logs ALTER COLUMN scheduled_time_reference DROP NOT NULL;",
    ),
    (
        "dispensation_logs: add schedule_id_legacy",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS schedule_id_legacy TEXT;",
    ),
    (
        "dispensation_logs: add patient_id_legacy",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS patient_id_legacy TEXT;",
    ),
    (
        "dispensation_logs: add dispenser_id_legacy",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS dispenser_id_legacy TEXT;",
    ),
    (
        "dispensation_logs: add medication_id_legacy",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS medication_id_legacy TEXT;",
    ),
    (
        "dispensation_logs: add success",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;",
    ),
    (
        "dispensation_logs: add error_message",
        "ALTER TABLE dispensation_logs ADD COLUMN IF NOT EXISTS error_message TEXT;",
    ),
    # --- patient_medications ---
    (
        "patient_medications: create table",
        """
        CREATE TABLE IF NOT EXISTS patient_medications (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            nome TEXT NOT NULL,
            dosagem TEXT NOT NULL,
            frequencia TEXT NOT NULL,
            horarios TEXT NOT NULL,
            observacoes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
    ),
    # --- refill_history ---
    (
        "refill_history: slot_id nullable",
        "ALTER TABLE refill_history ALTER COLUMN slot_id DROP NOT NULL;",
    ),
    (
        "refill_history: caregiver_id nullable",
        "ALTER TABLE refill_history ALTER COLUMN caregiver_id DROP NOT NULL;",
    ),
    (
        "refill_history: add dispenser_id_legacy",
        "ALTER TABLE refill_history ADD COLUMN IF NOT EXISTS dispenser_id_legacy TEXT;",
    ),
    (
        "refill_history: add medication_id_legacy",
        "ALTER TABLE refill_history ADD COLUMN IF NOT EXISTS medication_id_legacy TEXT;",
    ),
    (
        "refill_history: add performed_by_legacy",
        "ALTER TABLE refill_history ADD COLUMN IF NOT EXISTS performed_by_legacy TEXT;",
    ),
]


def run_migrations(engine: Engine) -> None:
    with engine.begin() as conn:
        for description, sql in _MIGRATIONS:
            try:
                conn.execute(text(sql))
                print(f"[migration] ok: {description}")
            except Exception as exc:
                print(f"[migration] FAILED: {description} — {exc}")
                raise
