import { STATE_TYPES, getGlobalName } from './state-common.js'
import { L } from './utils.js'

const getServer = name => {
  const
    mainWin = overwolf.windows.getMainWindow(),
    serverName = getGlobalName(name);

  if ( !mainWin ) {
    console.warn(`getServer(): couldn't obtain main window`);
    throw `couldn't obtain main window`;
  } else if ( !mainWin[serverName] ) {
    console.warn(`getServer(): couldn't obtain messenger server ${serverName}`);
    throw `couldn't obtain messenger server`;
  }

  return mainWin[serverName];
}

export const getState = () => getServer(STATE_TYPES.session);
export const getPersistentState = () => getServer(STATE_TYPES.persistent);
export const getSettingsState = () => getServer(STATE_TYPES.settings);
