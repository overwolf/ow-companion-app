import EventEmitter from './event-emitter.js'

import { objectCopy } from './utils.js'
import { STATE_TYPES, getGlobalName } from './state-common.js'

const fastParse = val => {
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
}

const fastStringify = val => {
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
}

const isPrimitive = val => ( typeof val !== 'object' || val === null );

const makeProxy = obj => new Proxy(obj, {
  ownKeys: (target) => target.keys(),
  has: (target, prop) => target.has(prop),
  get: (target, prop) => {
    if ( !target.proxyPass.includes(prop) )
      return target.get(prop);

    if ( typeof target[prop] !== 'function' )
      return target[prop];

    const boundName = `_bound_${prop}`;

    if ( target[boundName] )
      return target[boundName];
    else
      return target[boundName] = target[prop].bind(target);
  },
  set: (target, prop, value) => {
    target.set(prop, value);
    return true;
  },
  deleteProperty: (target, prop) => {
    target.remove(prop);
    return true;
  }
})

const createServer = name => {
  const globalName = getGlobalName(name);

  if ( window[globalName] )
    return window[globalName];

  let state;

  switch (name) {
    case STATE_TYPES.persistent:
      state = new PersistentState(name);
    break;
    case STATE_TYPES.settings:
      state = new SettingsState(name);
    break;
    case STATE_TYPES.session:
    default:
      state = new State;
    break;
  }

  return window[globalName] = makeProxy(state);
}

export class State extends EventEmitter {
  constructor() {
    super();

    this.proxyPass = ['on', 'off'];
    this.state = {};
  }
  keys() {
    return Object.keys(this.state);
  }
  has(key) {
    return ( this.state[key] !== undefined );
  }
  get(key) {
    if ( this.state[key] === undefined )
      return undefined;
    else if ( isPrimitive(this.state[key]) )
      return this.state[key];
    else
      return objectCopy(this.state[key]);
  }
  set(key, value) {
    if ( !isPrimitive(value) )
      value = objectCopy(value);

    this.state[key] = value;
    this.emit(key, value);
  }
  remove(key) {
    if ( this.state[key] !== undefined )
      delete this.state[key];

    this.emit(key, undefined);
  }
}

export class PersistentState extends State {
  constructor(name) {
    super();

    this.prefix = `${name}/`;
    this.prefixLength = this.prefix.length;

    this.hydrate();
  }
  hydrate() {
    for ( let fullKey in localStorage ) {
      if ( fullKey.length > this.prefixLength && fullKey.startsWith(this.prefix) ) {
        const key = fullKey.substr(this.prefixLength);
        this.state[key] = fastParse(localStorage[fullKey]);
      }
    }
  }
  set(key, value) {
    localStorage[this.prefix + key] = fastStringify(value);
    super.set(key, value);
  }
  remove(key) {
    delete localStorage[this.prefix + key];
    super.remove(key);
  }
}

export class SettingsState extends PersistentState {
  constructor(name) {
    super(name);

    this.proxyPass.push('setDefaults');
    this.defaults = {};
  }
  setDefaults(defaults) {
    this.defaults = objectCopy(defaults);
  }
  callListener(key, value) {
    if ( value === undefined && this.defaults[key] !== undefined ) {
      value = this.defaults[key];

      if ( !isPrimitive(value) )
        value = objectCopy(value);
    }

    super.callListener(key, value);
  }
  get(key) {
    const value = super.get(key);

    if ( value === undefined && this.defaults[key] !== undefined )
      return objectCopy(this.defaults[key]);
    else
      return value;
  }
}

export const getState = () => createServer(STATE_TYPES.session);
export const getPersistentState = () => createServer(STATE_TYPES.persistent);
export const getSettingsState = () => createServer(STATE_TYPES.settings);
