#!/bin/bash
set -e

# Run command with ringo if the first argument contains a "-" or is not a system command
if [ -z "${1}" ] || [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ]; then
  set -- ringo "$@"
fi

exec "$@"