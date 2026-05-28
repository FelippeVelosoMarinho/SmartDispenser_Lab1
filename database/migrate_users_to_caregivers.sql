BEGIN;

ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS hashed_password text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_caregivers_username ON caregivers(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_caregivers_tax_id ON caregivers(tax_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_caregivers_email ON caregivers(email);

DROP TABLE IF EXISTS users;

COMMIT;
