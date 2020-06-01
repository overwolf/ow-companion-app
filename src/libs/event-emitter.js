export default class EventEmitter {
constructor() {
  this.listeners = {};
}
hasListener(key) {
  return !!( this.listeners[key] && this.listeners[key].size );
}
callListener(key, value, context = null) {
  if ( this.hasListener(key) ) {
    for ( let [ref, listener] of this.listeners[key] ) {
      if ( listener )
        listener.call(context, value);
    }
  }
}
emit(...args) {
  this.callListener(...args);
}
_on(key, listener, ref = null) {
  if ( typeof listener !== 'function' )
    throw new Error('listener is not a function');

  const listeners = this.listeners;

  if ( ! listeners[key] )
    listeners[key] = new Map();

  if ( ref === null )
    ref = listener;

  listeners[key].set(ref, listener);
}
_off(arg, arg2 = null) {
  const listeners = this.listeners;

  if ( arg2 === null ) {
    for ( let key in listeners ) {
      if ( listeners[key] && listeners[key].has(arg) ) {
        listeners[key].delete(arg);

        if ( listeners[key].size === 0 )
          delete listeners[key];
      }
    }
  } else if ( listeners[arg] && listeners[arg].has(arg2) ) {
    listeners[arg].delete(arg2);

    if ( listeners[arg].size === 0 )
      delete listeners[arg];
  }
}
on(arg, arg2 = null, arg3 = null) {
  if ( typeof arg2 === 'function' ) {
    this._on(arg, arg2, arg3);
  } else {
    for ( let key in arg ) {
      this._on(key, arg[key], arg2);
    }
  }
}
off(arg, arg2 = null) {
  if ( arg2 !== null ) {
    if ( Array.isArray(arg) ) {
      for ( let key of arg ) {
        this._off(key, arg2);
      }
    } else {
      this._off(arg, arg2);
    }
  } else {
    this._off(arg);
  }
}
once(key, listener, ref = null) {
  if ( typeof listener !== 'function' )
    throw new Error('listener is not a function');

  const listeners = this.listeners;

  if ( ! listeners[key] )
    listeners[key] = new Map();

  if ( ref === null )
    throw new Error('once listener ref cannot be null');

  listeners[key].set(ref, (value) => {
    const res = listener.call(null, value);
    this._off(key, ref);
    return res;
  });
}
}
