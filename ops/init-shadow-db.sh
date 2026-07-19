#!/bin/bash
set -e

# Create the shadow database if it doesn't exist
# Prisma needs this for `migrate dev` (creating new migrations locally)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE pms_shadow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pms_shadow')\gexec
  GRANT ALL PRIVILEGES ON DATABASE pms_shadow TO $POSTGRES_USER;
EOSQL
