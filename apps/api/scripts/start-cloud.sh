#!/bin/sh
set -eu

# Run only committed migrations; stop startup if a migration fails.
npm run prisma:migrate:deploy

# Explicit opt-in for a new demonstration database, not production data.
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  npm run prisma:seed
fi

exec node dist/main.js
