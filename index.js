global.Olm = require('olm');
var sdk = require('matrix-js-sdk');
var LocalStorage = require('node-localstorage');

const enc = new TextEncoder();
var localStorage = new LocalStorage.LocalStorage('./store');

const ROOM_CRYPTO_CONFIG = { algorithm: 'm.megolm.v1.aes-sha2' };


const config ={
	"passphrase":"VERYSECUREPASSPHRASE",
	"user_id": "@user:matrix.synapse",
  	"user_password": "password",
  	"homeserver_url": "http://localhost:8008"
}


async function initApp() {
	matrixClient = await initMatrixClient();

	await matrixClient.startClient({ initialSyncLimit: 1 });
	await matrixClient.once('sync', async function (state, prevState, res) {
		if (state === 'PREPARED') {

			await matrixClient.joinEncryptedRoom(config.internal_room_id);
			await matrixClient.sendTextMessage("hello", config.internal_room_id);
			await matrixClient.stopClient();
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
		let userRegisterResult = await registerMatrixClient.loginWithPassword(config.user_id, config.user_password);
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
initApp();