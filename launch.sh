#!/bin/bash

# Get the user/channel ($1), subject ($2), and message ($3)
to="$1"
subject="$2"
message="$3"

workingDir="/usr/lib/zabbix/alertscripts/zabbix-matrix-script"

node "${workingDir}" "${to}" "${subject}" "${message}"

exit $?