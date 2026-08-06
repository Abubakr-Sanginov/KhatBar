#!/bin/sh
set -e

echo "=== ENV DEBUG ==="
env | sort
echo "=== DATABASE_URL: [${DATABASE_URL:-UNSET}] ==="

if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma db push..."
  npx prisma db push || echo "WARNING: prisma db push failed, continuing anyway..."
else
  echo "WARNING: DATABASE_URL not set, skipping prisma db push"
fi

echo "Starting server..."
exec node_modules/.bin/tsx server.ts
