#!/bin/bash

# Get the user/channel ($1), subject ($2), and message ($3)
to="$1"
subject="$2"
message="$3"

docker run zabbixmatrixscript $to $subject $message

exit $?