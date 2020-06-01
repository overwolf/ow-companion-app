import WS from 'websocket-as-promised'

import EventEmitter from '../libs/event-emitter'
import { L, delay } from '../libs/utils'

export default class WebSocket extends EventEmitter {
	constructor({ proto = 'ws', host = 'localhost', portFile = null, port = 10000, path = '', maxRetries = Infinity } = {}) {
		super();

		this.proto = proto;
		this.host = host;
		this.portFile = portFile;
		this.port = port;
		this.path = path;
		this.maxRetries = maxRetries;

		this._ws = null;
		this._connectPromise = null;
		this._connectCancelled = false;
	}
	get connected() {
		return (this._ws instanceof WS);
	}
	_fileExists(path) { return new Promise(resolve => {
		overwolf.io.fileExists(path, result => result.status === 'success' ? resolve(result.found) : reject(result))
	})}
	_readFileContents(path, encoding = 'UTF8') { return new Promise(resolve => {
		overwolf.io.readFileContents(path, encoding, result => result.status === 'success' ? resolve(result.content) : reject(result))
	})}
	async _getPortFromFile(path) {
		const exists = await this._fileExists(path);

		if ( exists ) {
			const contents = await this._readFileContents(path);

			try {
				const { port } = JSON.parse(contents);

				return port;
			} catch (e) {
				console.error(e)
			}
		}

		return null;
	}
	async _connect() {
		let port;

		if ( this.portFile ) {
			const result = await this._getPortFromFile(this.portFile);

			if ( result ) {
				port = result;
				console.log('Websocket port read:', port);
			}
		}

		if ( !port ) {
			console.log('Websocket port could not be read, falling back to default:', this.port);
			port = this.port;
		}

		const ws = new WS(`${this.proto}://${this.host}:${port}${this.path}`);

		await ws.open();
		await ws.onError.addListener(e => console.error(e));

		return ws;
	}
	async _connectWithRetry() {
		let retry = 0;

		while ( !this.connected && retry < this.maxRetries && !this._connectCancelled ) {
			try {
				retry++;

				if ( retry > 1 ) {
					console.log(`Websocket retrying connection, attempt ${retry}/${this.maxRetries}`);
					await delay(2000);
				}

				this._ws = await this._connect();
				return true;
			} catch(e) {
				this._ws = null;
				console.error(...L('Websocket error:', e));
			}
		}

		return false;
	}
	async _onConnectionClosed(e) {
		console.log(...L(`Websocket closed`, e.reason, e));

		await this.disconnect(e);
		await this.connect();
	}
	_bindEvents() {
		this._ws.onMessage.addListener(payload => {
			try {
				payload = JSON.parse(payload);
			} catch(e) {
				console.log(...L(`Websocket message is not valid JSON`, e, payload));
			}

			this.emit('message', payload);
		});
		this._ws.onClose.addListener(e => this._onConnectionClosed(e));
	}
	async connect() {
		console.log('Websocket connecting');

		if ( this.connected )
			return true;

		if ( this._connectPromise !== null ) {
			this._connectCancelled = true;
			await this._connectPromise;
		}

		this._connectCancelled = false;

		this._connectPromise = this._connectWithRetry();

		const success = await this._connectPromise;

		this._connectPromise = null;

		if ( success ) {
			console.log('Websocket connected');
			this._bindEvents();
			this.emit('connected');
		} else {
			console.log('Websocket could not connect');
		}

		return success;
	}
	async disconnect(message) {
		if ( !this.connected )
			return;

		const ws = this._ws;
		this._ws = null;
		this._connectPromise = null;
		this._connectCancelled = false;
		ws.removeAllListeners();
		await ws.close();
		this.emit('disconnected', message);
	}
	send(payload) {
		try {
			if ( !this.connected )
				throw 'no connection';

			this._ws.send(JSON.stringify(payload));
			return true;
		} catch (error) {
			console.log(...L('Could not send websocket message:', error, '/ payload:', payload));
		}

		return false;
	}
}
