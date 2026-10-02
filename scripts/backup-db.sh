#!/usr/bin/env sh
# Nightly logical backup of the KEYSTONE database, e.g. from cron:
#   0 2 * * *  /opt/keystone/scripts/backup-db.sh
# Connection details come from the environment (never hard-coded):
#   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, BACKUP_DIR (default ./backups), BACKUP_KEEP_DAYS (default 14)
# On a managed database (RDS, Cloud SQL, Azure Database) also keep the provider's automated
# backups and point-in-time recovery switched on; this script is the portable second copy.
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/keystone-${PGDATABASE:-keystone_db}-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
# Custom format: compressed, and restorable table by table with pg_restore.
pg_dump --format=custom --no-owner --file="$FILE"
echo "Backup written: $FILE"

# Upload the file to object storage here if configured, e.g.:
#   aws s3 cp "$FILE" "s3://$BACKUP_BUCKET/postgres/"     or     gsutil cp "$FILE" "gs://$BACKUP_BUCKET/postgres/"

find "$BACKUP_DIR" -name 'keystone-*.dump' -mtime +"$KEEP_DAYS" -delete
# Restore: pg_restore --clean --if-exists --no-owner -d "$PGDATABASE" <file>.dump
