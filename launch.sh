#!/bin/bash

# Get the user/channel ($1), subject ($2), and message ($3)
to="$1"
subject="$2"
message="$3"

docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/src/app/config.json --mount type=bind,source="$(pwd)"/store,target=/usr/src/app/store zabbixmatrixscript $to $subject $message

exit $?