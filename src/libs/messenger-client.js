import { L } from './utils.js'
import { SERVER_NAME } from './messenger-constants.js'

const getServer = () => {
  const mainWin = overwolf.windows.getMainWindow();

  if ( !mainWin ) {
    console.warn(...L(`getServer(): couldn't obtain main window`));
    throw `couldn't obtain main window`;
  } else if ( !mainWin[SERVER_NAME] ) {
    console.warn(...L(`getServer(): couldn't obtain messenger server`));
    throw `couldn't obtain messenger server`;
  }

  return mainWin[SERVER_NAME];
}

export default getServer();
