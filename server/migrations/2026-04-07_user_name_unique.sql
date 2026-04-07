-- Unicité du nom (insensible à la casse / espaces) — aligné avec assertUniqueUserName.
-- Échoue s'il existe déjà des doublons ; les résoudre avant d'appliquer.
CREATE UNIQUE INDEX IF NOT EXISTS user_name_lower_trim_unique ON "user" (LOWER(TRIM("name")));
