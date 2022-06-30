# zabbix-matrix-script

This script sends E2EE (End-to-end encryption) notifications to Matrix server from Zabbix.

# Installation

Copy the zabbix-matrix-script folder to your Zabbix alert scripts directory. This is usually located in: /usr/lib/zabbix/alertscripts/

Perform the package installation in the resulting ../alertscripts/zabbix-matrix-script folder with `npm install`.

Change the user id, password and homeserver parameters to appropriate values in [`config.json`](config.json).

Test out the script by sending a test message to a room. First, copy the internal room id of a room, which has the bot joined/invited. It can be found on the Element app in Room options -> Settings -> Advanced -> Room information.

Send out a test message with `node . '!YOURROOMID:homeserver' 'Subject' 'Body'`.

Setting up Zabbix media type. First, [import](https://www.zabbix.com/documentation/current/manual/xml_export_import/media#importing) the [`zbx_export_mediatypes.yaml`](zbx_export_mediatypes.yaml) file into your zabbix installation. Depending on the Zabbix server version, you might need to tweak the file before importing it.

Lastly, setup the Matrix E2EE media type for your zabbix user with `Send to` value set to the internal room id.

# Notes

Credentials in [`config.json`](config.json) are used only on first login. We use the device ID and token in the store for successive logins. This stops the server from generating a new device each time we send a message.

# Dependencies 
1. [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) for matrix communications.
2. [JS Olm binding](https://gitlab.matrix.org/matrix-org/olm) for the E2EE implementation.
3. [node-localstorage](https://www.npmjs.com/package/node-localstorage) as a replacement for Web Storage session store.
