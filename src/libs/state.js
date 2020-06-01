import EventEmitter from './event-emitter.js'

import { objectCopy } from './utils.js'

const primitiveParse = val => {
	switch (val) {
		case 'true':
			return true;
		case 'false':
			return false;
		case 'null':
			return null;
		case 'undefined':
		case undefined:
			return undefined;
		default:
			return JSON.parse(val);
	}
};

const primitiveStringify = val => {
	switch (val) {
		case true:
			return 'true';
		case false:
			return 'false';
		case null:
			return 'null';
		case undefined:
			return undefined;
		default:
			return JSON.stringify(val);
	}
};

export class PersistentState extends EventEmitter {
	constructor(name = 'persistent') {
		super();

		this.name			= name;
		this.prefix			= name +'/';
		this.prefixLength	= this.prefix.length;
		this.proxyPass		= ['on', 'off'];
		this.cache			= {};
		this.proxy			= this.proxified();

		this.handleStorageEventBound = this.handleStorageEvent.bind(this);

		window.addEventListener('storage', this.handleStorageEventBound, false);
	}
	destroy() {
		window.removeEventListener('storage', this.handleStorageEventBound, false);
	}
	handleStorageEvent({ key: fullKey }) {
		if ( fullKey <= this.prefixLength || !fullKey.startsWith(this.prefix) )
			return;

		const key = fullKey.substr(this.prefixLength);

		if ( key ) {
			const value = localStorage[fullKey];

			if ( value === undefined ) {
				delete this.cache[key];

				if ( this.hasListener(key) )
					this.callListener(key, undefined);
			} else {
				this.cache[key] = value;

				if ( this.hasListener(key) )
					this.callListener(key, primitiveParse(value));
			}
		}
	}
	has(key) {
		if ( this.cache[key] !== undefined )
			return true;

		return localStorage.hasOwnProperty(this.prefix + key);
	}
	get(key) {
		if ( this.cache[key] === undefined )
			return primitiveParse(localStorage[this.prefix + key]);
		else
			return primitiveParse(this.cache[key]);
	}
	getUnparsed(key) {
		if ( this.cache[key] === undefined )
			return localStorage[this.prefix + key];
		else
			return this.cache[key];
	}
	set(key, value) {
		const
			old = this.getUnparsed(key),
			stringValue = primitiveStringify(value);

		if ( old === undefined || old !== stringValue ) {
			this.cache[key] = stringValue;
			localStorage[this.prefix + key] = stringValue;
			this.callListener(key, value);
		}
	}
	remove(key) {
		if ( !this.has(key) )
			return;

		if ( this.cache[key] !== undefined )
			delete this.cache[key];

		delete localStorage[this.prefix + key];

		this.callListener(key, undefined);
	}
	proxified() { return new Proxy(this, {
		has(target, prop) {
			return target.has(prop);
		},
		get(target, prop) {
			if ( target.proxyPass.includes(prop) ) {
				if ( typeof target[prop] === 'function' )
					return (...args) => target[prop].call(target, ...args);
				else
					return target[prop];
			}

			return target.get(prop);
		},
		set(target, prop, value) {
			target.set(prop, value);
			return true;
		},
		deleteProperty(target, prop) {
			target.remove(prop);
			return true;
		},
		ownKeys() {
			return [];
		}
	})}
}

export class SettingsState extends PersistentState {
	constructor(name = 'settings') {
		super(name);
		this.proxyPass.push('setDefault');
		this.defaults = {};
	}
	setDefaults(defaults) {
		this.defaults = defaults;
	}
	setDefault(defaults) {
		this.defaults = defaults;
	}
	callListener(key, value) {
		if ( value === undefined && this.defaults[key] !== undefined )
			value = this.defaults[key];

		super.callListener(key, value);
	}
	get(key) {
		const value = super.get(key);

		return ( value === undefined && this.defaults[key] !== undefined ) ? objectCopy(this.defaults[key]) : value;
	}
}

export class SessionState extends PersistentState {
	constructor(name = 'state') {
		super(name);
		this.proxyPass.push('reset');
	}
	reset() {
		this.cache = {};

		for ( let key in localStorage ) {
			if ( key.startsWith(this.prefix) )
				delete localStorage[key];
		}
	}
}

export { PersistentState as default };
export const persState = (new PersistentState).proxy;
export const settings = (new SettingsState).proxy;
export const state = (new SessionState).proxy;
