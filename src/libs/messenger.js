import uuid from 'uuid'
import EventEmitter from './event-emitter.js'

import { delay, objectCopyJSON, L } from './utils.js'

const responseStatus = {
	NOTHING			: 0,
	NO_WINDOW		: 1,
	NO_MESSENGER	: 2,
	NO_LISTENER		: 3,
	SUCCESS 		: 4
};

class Messenger extends EventEmitter {
constructor(globalName = '_OverwolfAppWindowMessenger') {
	super();

	this.globalName = globalName;
	this.winName = null;

	window[globalName] = this;
}
async _openWindow(win) {
	const obtain = await new Promise(r => overwolf.windows.obtainDeclaredWindow(win, r));

	if ( obtain.status !== 'success' || !obtain.window ) {
		console.warn(...L(`Messenger._openWindow(): couldn't obtain window ${win}:`, obtain));
		return false;
	}

	if ( obtain.window.stateEx === 'closed' ) {
		const open = await new Promise(r => overwolf.windows.hide(win, r));

		if ( open.status !== 'success' ) {
			console.warn(...L(`Messenger._openWindow(): couldn't open window ${win}:`, open));
			return false;
		}
	}

	return true;
}
async _getWinName() {
	return await new Promise((resolve, reject) => {
		overwolf.windows.getCurrentWindow(res => {
			if ( res && res.status === 'success' && res.window && res.window.name )
				resolve(res.window.name);
			else
				reject(res);
		});
	});
}
_getRespondingMessenger(win, id) { return new Promise(resolve => {
	overwolf.windows.getOpenWindows(windows => {
		if ( !windows )
			return resolve({ status: responseStatus.NOTHING });

		if ( !windows[win] )
			return resolve({ status: responseStatus.NO_WINDOW });

		const globalName = this.globalName;

		if ( !windows[win][globalName] )
			return resolve({ status: responseStatus.NO_MESSENGER });

		const messenger = windows[win][globalName];

		if ( !messenger.hasListener(id) )
			return resolve({ status: responseStatus.NO_LISTENER });

		resolve({
			status: responseStatus.SUCCESS,
			messenger
		});
	});
})}
async send(win, id, content = null, { restoreWindow = true, tries = 25, retryInterval = 200, log = true } = {}) {
	let i = 0;

	while ( i < tries ) {
		if ( i !== 0 )
			await delay(retryInterval);

		const result = await this._getRespondingMessenger(win, id);

		switch ( result.status ) {
			case responseStatus.NOTHING:
				if ( log )
					console.warn('Messenger.send(): no windows');

				return false;
			break;
			case responseStatus.NO_WINDOW:
				if ( log && i > 0 )
					console.log(`Messenger.send(): no window ${win} after ${(i+1)} tries`);

				if ( restoreWindow )
					await this._openWindow(win);
			break;
			case responseStatus.NO_MESSENGER:
				if ( log && i > 0 )
					console.log(`Messenger.send(): no messenger at ${win} after ${(i+1)} tries`);
			break;
			case responseStatus.NO_LISTENER:
				if ( log && i > 0 )
					console.log(`Messenger.send(): no listener at ${win}/${id} after ${(i+1)} tries`);
			break;
			case responseStatus.SUCCESS:
				result.messenger.callListener(id, content);
				return true;
			break;
		}

		i++;
	}

	if ( log )
		console.warn(`Messenger.send(): failed to deliver message to ${win}/${id} after ${(i+1)} tries`);

	return false;
}
async sendAndForget(win, id, content = null) {
	const result = await this._getRespondingMessenger(win, id);

	if ( result.status === responseStatus.SUCCESS ) {
		result.messenger.callListener(id, content);
		return true;
	}

	console.log(`Messenger.sendAndForget(): couldn't deliver message to ${win}/${id}, status ${result.status}`);

	return false;
}
async request(win, id, content = null, options = {}) {
	const
		uid = uuid(),
		timeout = options.timeout || (5 * 60 * 1000);

	if ( !this.winName )
		this.winName = await this._getWinName();

	const promise = new Promise(r => {
		setTimeout(() => {
			this.off(uid, r, uid);
			r(null);
		}, timeout);

		this.once(uid, r, uid);
	});

	const message = { win: this.winName, uid, content };

	await this.send(win, id, message, options);

	return promise;
}
serveRequests(id, processRequest, ref = null) {
	this.on(id, async ({ win, uid, content }) => {
		let results = processRequest(content);

		while ( results instanceof Promise )
			results = await results;

		this.sendAndForget(win, uid, results);
	}, ref);
}
}

export default new Messenger
