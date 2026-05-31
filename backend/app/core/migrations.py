"""DDL migrations applied at startup. Each statement is idempotent."""

from sqlalchemy import text
from sqlalchemy.engine import Engine

# Each entry is (description, SQL). Executed in order every startup; all
# use IF NOT EXISTS / DO NOTHING so re-running is safe.
_MIGRATIONS: list[tuple[str, str]] = [
    # --- caregivers ---
    (
        "caregivers: add username",
        "ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;",
    ),
    (
        "caregivers: add hashed_password",
        "ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS hashed_password TEXT;",
    ),
    (
        "caregivers: add email",
        "ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;",
    ),
    (
        "caregivers: add notifications_enabled",
        "ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;",
    ),
    (
        "caregivers: add tax_id",
        "ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS tax_id TEXT;",
    ),
    # --- dispensers ---
    (
        "dispensers: patient_id nullable",
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='dispensers' AND column_name='patient_id'
            ) THEN
                ALTER TABLE dispensers ALTER COLUMN patient_id DROP NOT NULL;
            END IF;
        END $$;""",
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
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='patients' AND column_name='tax_id'
            ) THEN
                ALTER TABLE patients ALTER COLUMN tax_id DROP NOT NULL;
            END IF;
        END $$;""",
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
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='schedules' AND column_name='slot_id'
            ) THEN
                ALTER TABLE schedules ALTER COLUMN slot_id DROP NOT NULL;
            END IF;
        END $$;""",
    ),
    (
        "schedules: medication_id nullable",
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='schedules' AND column_name='medication_id'
            ) THEN
                ALTER TABLE schedules ALTER COLUMN medication_id DROP NOT NULL;
            END IF;
        END $$;""",
    ),
    (
        "schedules: scheduled_time nullable",
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='schedules' AND column_name='scheduled_time'
            ) THEN
                ALTER TABLE schedules ALTER COLUMN scheduled_time DROP NOT NULL;
            END IF;
        END $$;""",
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
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='dispensation_logs' AND column_name='slot_id'
            ) THEN
                ALTER TABLE dispensation_logs ALTER COLUMN slot_id DROP NOT NULL;
            END IF;
        END $$;""",
    ),
    (
        "dispensation_logs: scheduled_time_reference nullable",
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='dispensation_logs' AND column_name='scheduled_time_reference'
            ) THEN
                ALTER TABLE dispensation_logs ALTER COLUMN scheduled_time_reference DROP NOT NULL;
            END IF;
        END $$;""",
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
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='refill_history' AND column_name='slot_id'
            ) THEN
                ALTER TABLE refill_history ALTER COLUMN slot_id DROP NOT NULL;
            END IF;
        END $$;""",
    ),
    (
        "refill_history: caregiver_id nullable",
        """DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='refill_history' AND column_name='caregiver_id'
            ) THEN
                ALTER TABLE refill_history ALTER COLUMN caregiver_id DROP NOT NULL;
            END IF;
        END $$;""",
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
                if "does not exist" in str(exc).lower():
                    print(f"[migration] SKIPPED (not exists): {description}")
                    continue
                print(f"[migration] FAILED: {description} — {exc}")
                raise
