#!/bin/sh
set -e

# Schema changes are applied by the one-shot `migrate` service (prisma migrate deploy),
# never at container start. `prisma db push` is not used against any shared database:
# it drops tables that are not in schema.prisma, including tables owned by the Rust API.
exec npm start
