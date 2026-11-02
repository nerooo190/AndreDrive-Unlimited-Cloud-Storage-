#!/bin/sh
set -eu
# A newly mounted persistent disk can be owned by root. Only fix the mount root;
# files created by the application remain owned by the unprivileged node user.
mkdir -p "$DATA_DIR"
if [ "$(id -u)" = '0' ]; then
  chown node:node "$DATA_DIR"
  exec gosu node "$@"
fi
exec "$@"
