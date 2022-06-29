global.Olm = require('olm');
var sdk = require('matrix-js-sdk');
var LocalStorage = require('node-localstorage');

var localStorage = new LocalStorage.LocalStorage('./store');

const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };

// Read in config from file
var config = require('./config.json');


async function initApp(to, subject, message) {
	matrixClient = await initMatrixClient();

	config.internal_room_id = to;
	await matrixClient.startClient({ initialSyncLimit: 1 });
	await matrixClient.once('sync', async function (state, prevState, res) {
		if (state === 'PREPARED') {

			await matrixClient.joinEncryptedRoom(config.internal_room_id);
			await matrixClient.sendTextMessage(subject+'\n'+message, config.internal_room_id);
			await matrixClient.stopClient();
			process.exit(0);
		} else {
			console.log(state);
			process.exit(1);
		}
	});
}

async function initMatrixClient() {

	// Initialize the OLM (cryptographic) library
	await global.Olm.init();

	// Log in and retrieve the new device ID and session key
	const registerMatrixClient = sdk.createClient(config.homeserver_url);

	let exportedDevice = localStorage.getItem('exportedDevice');
	let accessToken = localStorage.getItem('accessToken');
	let matrixClient = null;
	// Create accessToken and exportedDevice if not exists
	if (!accessToken || !exportedDevice) {
		// Callback if failed to Login
		let userRegisterResult = await registerMatrixClient.loginWithPassword(config.user_id, config.user_password, function (err, data) {if (err) {console.log(err+": Failed to login."); process.exit(1);}});
		accessToken = userRegisterResult.access_token;
		exportedDevice = userRegisterResult.device_id;
		localStorage.setItem('accessToken', accessToken);
		localStorage.setItem('exportedDevice', exportedDevice);

		// Initialize a MatrixClient instance using the retrieved authorization data.
		matrixClient = sdk.createClient({
			baseUrl: config.homeserver_url,
			userId: config.user_id,
			accessToken: userRegisterResult.access_token,
			deviceId: userRegisterResult.device_id,
			sessionStore: new sdk.WebStorageSessionStore(localStorage),
			cryptoStore: new sdk.MemoryCryptoStore(),
		});
	} else {
		matrixClient = sdk.createClient({
			baseUrl: config.homeserver_url,
			userId: config.user_id,
			deviceToImport: exportedDevice,
			accessToken,
			deviceId: exportedDevice,
			sessionStore: new sdk.WebStorageSessionStore(localStorage),
			cryptoStore: new sdk.MemoryCryptoStore(),
		});
	}

	extendMatrixClient(matrixClient);

	// Initializing crypto creates a new Olm device and 
	// generates device keys (Ed25519 fingerprint key pair and Curve25519 identity key pair)
	await matrixClient.initCrypto();
	//await matrixClient.startClient();
	return matrixClient;
}

function extendMatrixClient(matrixClient) {

	// automatic join
	matrixClient.on("RoomMember.membership", function (event, member) {
		if (member.membership === "invite" && member.userId === config.user_id) {
			matrixClient.joinRoom(member.roomId).then(function () {
				console.log("Auto-joined %s", member.roomId);
			});
		}
	});

	matrixClient.joinEncryptedRoom = async function (roomId) {

		// matrixClient.setRoomEncryption() only updates local state
		await this.setRoomEncryption(
			roomId, ROOM_CRYPTO_CONFIG,
		);

		// Marking all devices as verified
		let room = this.getRoom(roomId);
		let members = (await room.getEncryptionTargetMembers()).map(x => x["userId"])
		let memberkeys = await this.downloadKeys(members);
		for (const userId in memberkeys) {
			for (const deviceId in memberkeys[userId]) {
				await this.setDeviceVerified(userId, deviceId);
			}
		}
	}

	matrixClient.sendTextMessage = async function (message, roomId) {
		return matrixClient.sendMessage(
			roomId,
			{
				body: message,
				msgtype: 'm.text',
			}
		)
	}
}

try {
	var params = process.argv.slice(2);
	initApp.apply(this, params);
  } catch (error) {
	process.exit(1);
}