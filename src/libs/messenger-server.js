import uuid from 'uuid'
import EventEmitter from './event-emitter.js'

import { delay, objectCopyJSON, L } from './utils.js'
import { SERVER_NAME } from './messenger-constants.js'

class MessengerServer extends EventEmitter {
  async _obtain(win) {
    const obtain = await new Promise(r => overwolf.windows.obtainDeclaredWindow(win, r));

    if ( obtain.status !== 'success' || !obtain.window )
      throw `MessengerServer._obtain(): could not obtain window ${win}`;

    return obtain.window;
  }
  async _unhideWindow(win) {
    const open = await new Promise(r => overwolf.windows.hide(win, r));

    if ( open.status !== 'success' )
      throw `MessengerServer._unhideWindow(): could not restore window ${win}`;

    return true;
  }
  async _restoreWindow(win) {
    const open = await new Promise(r => overwolf.windows.restore(win, r));

    if ( open.status !== 'success' )
      throw `MessengerServer._restoreWindow(): could not restore window ${win}`;

    return true;
  }
  async openAndEmit(win, id, content = null, { restore = false, tries = 50, retryInterval = 100, log = true } = {}) {
    let i = 0;

    let opened = false;

    try {
      while ( i < tries ) {
        if ( i > 0 )
          await delay(retryInterval);

        if ( !opened ) {
          const targetWin = await this._obtain(win);

          if ( targetWin.stateEx === 'closed' ) {

            if ( restore )
              await this._restoreWindow(win);
            else
              await this._unhideWindow(win);

            opened = true;
          }
        }

        if ( this.hasListener(id, content) ) {
          this.callListener(id, content);
          return true;
        }

        i++;
      }
    } catch(e) {
      if ( log ) {
        console.log(`MessengerServer.restoreAndEmit(): failed to deliver message to ${win}/${id} after ${(i+1)} tries`);
        console.error(e);
      }

      return false;
    }

    if ( log )
      console.log(`MessengerServer.restoreAndEmit(): failed to deliver message to ${win}/${id} after ${(i+1)} tries`);

    return false;
  }
  emit(id, content = null) {
    if ( this.hasListener(id, content) ) {
      this.callListener(id, content);
      return true;
    }

    return false;
  }
}

const server = window[SERVER_NAME] = new MessengerServer;

export default server;
