#!/bin/bash

# Get the user/channel ($1), subject ($2), and message ($3)
to="$1"
subject="$2"
message="$3"

workingDir="/usr/lib/zabbix/alertscripts/zabbix-matrix-script"

docker run --mount type=bind,source="${workingDir}"/config.json,target=/usr/src/app/config.json --mount type=bind,source="${workingDir}"/store,target=/usr/src/app/store zabbixmatrixscript "${to}" "${subject}" "${message}"

exit $?