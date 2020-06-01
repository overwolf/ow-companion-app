import EventEmitter from './event-emitter.js'
import binder from './binder.js'

import { delay, L } from './utils.js'

export default class GameEvents extends EventEmitter {
constructor(features) {
	super();

	this.features		= features;
	this.featuresSet	= null;
	this.state			= {};
	this.retries		= 60;

	this._bound = binder(this);

	overwolf.games.events.onError.addListener(this._bound.onError);
}
destroy() {
	this.removeListeners();
	overwolf.games.events.onError.removeListener(this._bound.onError);
}
async start(gameStatus) {
	this.stop();

	const result = await this.setRequiredFeatures(gameStatus);

	if ( result ) {
		overwolf.games.events.getInfo(this._bound.onGotInfo);
		this.setListeners();
	}
}
stop() {
	this.state = {};
	this.removeListeners();
}
removeListeners() {
	overwolf.games.events.onInfoUpdates2.removeListener(this._bound.onInfoUpdate);
	overwolf.games.events.onNewEvents.removeListener(this._bound.onNewEvent);
}
setListeners() {
	overwolf.games.events.onInfoUpdates2.addListener(this._bound.onInfoUpdate);
	overwolf.games.events.onNewEvents.addListener(this._bound.onNewEvent);
}
onError(err) {
	console.log(...L('gameEvents: error:', err));
}
onGotInfo(data) {
	if ( !data || data.status === 'error' || !data.res )
		return;

	const info = data.res;

	for ( let category in info ) {
		if ( category === 'features' )
			continue;

		for ( let key in info[category] ) {
			const path = category +'.'+ key;

			let val = info[category][key];

			if ( val !== undefined && ( this.state[path] === undefined || this.state[path] !== val ) ) {
				this.state[path] = val;

				try {
					val = JSON.parse(val);
				} catch(e) {}

				const e = { path, category, key, val };

				this.emit('*', e);
				this.emit(path, e);
			}
		}
	}
}
onInfoUpdate(data) {
	if ( !data || !data.info )
		return;

	const info = data.info;

	for ( let category in info ) {
		for ( let key in info[category] ) {
			const path = category +'.'+ key;

			let val = info[category][key];

			if ( val !== undefined && ( this.state[path] === undefined || this.state[path] !== val ) ) {
				this.state[path] = val;

				try {
					val = JSON.parse(val);
				} catch(e) {}

				const e = { path, category, key, val };

				this.emit('*', e);
				this.emit(path, e);
			}
		}
	}
}
onNewEvent(data) {
	if ( !data.events || !data.events.length )
		return;

	for ( let event of data.events ) {
		const
			category = 'events',
			key = event.name,
			path = category +'.'+ key;

		let val = event.data;

		if ( val !== undefined && ( this.state[path] === undefined || this.state[path] !== val ) )
			this.state[path] = val;

		try {
			val = JSON.parse(val);
		} catch(e) {}

		const e = { path, category, key, val };

		this.emit('*', e);
		this.emit(path, e);
	}
}
_setRequiredFeatures() {
	return new Promise(r => overwolf.games.events.setRequiredFeatures(this.features, r));
}
async setRequiredFeatures(gameStatus) {
	let tries = 0,
		result;

	while ( tries < this.retries && gameStatus.isRunning ) {
		result = await this._setRequiredFeatures();

		if ( result.status === 'success' ) {
			console.log(...L('setRequiredFeatures(): success:', result));
			this.featuresSet = result.supportedFeatures;
			return !!result.supportedFeatures.length;
		}

		await delay(2000);
		tries++;
	}

	this.featuresSet = false;
	console.log(...L(`setRequiredFeatures(): failure after ${tries + 1} tries:`, result));
	return false;
}
}
