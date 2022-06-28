global.Olm = require('olm');
var sdk = require('matrix-js-sdk');
var LocalStorage = require('node-localstorage');

const enc = new TextEncoder();
var localStorage =  new LocalStorage.LocalStorage('./store');

const config ={
	"passphrase":"VERYSECUREPASSPHRASE",
	"user_id": "@user:matrix.synapse",
  	"user_password": "password",
  	"homeserver_url": "http://localhost:8008"
}

async function initApp(){

	// Initialize the OLM (cryptographic) library
	await global.Olm.init();

	// Log in and retrieve the new device ID and session key
	const registerMatrixClient = sdk.createClient(config.homeserver_url);
	let userRegisterResult = await registerMatrixClient.loginWithPassword(config.user_id, config.user_password);

	// Initialize a MatrixClient instance using the retrieved authorization data.
	const matrixClient = sdk.createClient({
		baseUrl: config.homeserver_url,
		userId: userRegisterResult.user_id,
		accessToken: userRegisterResult.access_token,
		deviceId: userRegisterResult.device_id,
		sessionStore: new sdk.WebStorageSessionStore(localStorage),
		cryptoStore: new sdk.MemoryCryptoStore(),
	  });

	// Get information about the user
	let uinfo = await matrixClient.whoami();
	console.log("Bootstrapping user: "+uinfo.user_id+" with device ID: "+uinfo.device_id);
	

	// Initializing crypto creates a new Olm device and 
	// generates device keys (Ed25519 fingerprint key pair and Curve25519 identity key pair)
	await matrixClient.initCrypto();

	await matrixClient.uploadKeys();
	await matrixClient.logout();
}

initApp();