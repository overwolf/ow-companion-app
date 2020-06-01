import uuid from 'uuid'

import GameEvents from './libs/game-events.js'
import OverwolfWindow from './libs/overwolf-window.js'

import WebSocketService from './services/web-socket.js'
import LoggerService from './services/logger.js'
import RecorderService from './services/recorder.js'

import KeyCodes from './constants/key-codes.js'
import GameFeatures from './constants/game-features.js'
import MessageTypes from './constants/message-types.js'
import Hotkeys from './constants/hotkeys.js'
import { MatchStartEvents, MatchEndEvents } from './constants/match-events.js'

import { L } from './libs/utils.js'
import { getState, getPersistentState } from './libs/state-server.js'
import gameStatus from './libs/game-status.js'
import messenger from './libs/messenger-server.js'

const websocketOptions = {
	proto: 'ws',
	host: 'localhost',
	portFile: `${overwolf.io.paths.commonAppData}/OverwolfCompanion/ws`.split('\\').join('/'),
	port: 5679,
	path: '',
	maxRetries: Infinity
};

const
	startedWithGameEvent = location.href.includes('gamelaunchevent'),
	startedWithOverwolf = location.href.includes('source=overwolfstartlaunchevent'),
	WINDOW_HANDLE = location.pathname;

const
	state			= getState(),
	persState		= getPersistentState(),
	ws				= new WebSocketService(websocketOptions),
	logger			= new LoggerService,
	recorder		= new RecorderService,
	gameEvents		= new GameEvents(GameFeatures),
	mainWin			= new OverwolfWindow('main'),
	shareWin		= new OverwolfWindow('share');

async function start() {
	console.log('Overwolf Companion starting');

	ws.connect();

	await gameStatus.start();

	updateHotkeys();
	setInterval(updateHotkeys, 10000);
	registerHotkeys();

	if ( gameStatus.isRunning )
		await onGameLaunched();

	recorder.on({
		highlightCaptured	: onHighlightCaptured,
		replayCaptured		: onReplayCaptured,
		gameSessionStarted	: recorderSessionStarted,
		gameSessionEnded	: recorderSessionEnded,
		recordingStarted	: recorderRecordingStarted,
		recordingEnded		: recorderRecordingEnded
	}, WINDOW_HANDLE);

	await recorder.start();

	ws.on({ onSocketMessage }, WINDOW_HANDLE);

	gameStatus.on({
		'*'		: onGameStatusChange,
		running	: onGameRunningChange
	}, WINDOW_HANDLE);

	overwolf.windows.onMainWindowRestored.addListener(onMainWindowRestored);

	if ( !startedWithGameEvent && !startedWithOverwolf )
		await mainWin.restore();

	console.log('Overwolf Companion started');
}
function onSocketMessage(payload) {
	console.log(...L('Received message:', payload));

	if ( !payload )
		return;

	const { messageType = null } = payload;

	delete payload.messageType;

	switch (messageType) {
		case MessageTypes.SHARE_VIDEO:
			shareVideo(payload);
		break;
	}
}
function recorderSessionStarted() {
	return showNotice({
		text: `Overwolf Companion is running!<br /> Press ${state['hotkey/overwolf-companion-record']} to record gameplay.`,
		action: { win: 'main', method: 'restore' }
	});
}
function recorderSessionEnded() {
	return showNotice({
		text: 'You have recorded gameplay!<br /> Click to view.',
		action: { win: 'main', method: 'restore' }
	});
}
function recorderRecordingStarted() {
	return showNotice({
		text: `Recording started!<br /> Press ${state['hotkey/overwolf-companion-record']} to stop.`
	});
}
function recorderRecordingEnded() {
	return showNotice({
		text: 'Recording saved!',
		action: { win: 'main', method: 'restore' }
	});
}
async function onMainWindowRestored() {
	const { status, window_state } = await mainWin.getWindowState();

	if ( status === 'success' && window_state !== 'normal' )
		await mainWin.restore();
	else
		await mainWin.close();
}
function onGameStatusChange(e) {
	const content = {
		messageType: MessageTypes.GAME_STATUS,
		...e
	};

	ws.send(content);
	logger.logGameStatus(content);
}
function onGameRunningChange() {
	if ( gameStatus.isRunning )
		onGameLaunched();
	else
		onGameClosed();
}
async function onGameLaunched() {
	const { gameID, gameInfo } = gameStatus;

	console.log(`onGameLaunched(): ${gameID} ${gameInfo.title}`);

	overwolf.games.inputTracking.onKeyDown.addListener(onKeyDownEvent);
	overwolf.games.inputTracking.onMouseDown.addListener(onMouseDownEvent);

	await gameEvents.start(gameStatus);

	gameEvents.on('*', onGameEvent, WINDOW_HANDLE);
}
async function onGameClosed() {
	const { lastGameID: gameID } = gameStatus;

	console.log(`onGameClosed(): ${gameID}`);

	gameEvents.off(WINDOW_HANDLE);
	gameEvents.stop();

	overwolf.games.inputTracking.onKeyDown.removeListener(onKeyDownEvent);
	overwolf.games.inputTracking.onMouseDown.removeListener(onMouseDownEvent);
}
function onGameEvent(e) {
	recorder.onGameEvent(e);

	const data = {
		messageType	: MessageTypes.GAME_EVENT,
		key			: e.path,
		event		: e.val,
		time		: Date.now()
	};

	if ( MatchStartEvents.includes(e.key) || MatchEndEvents.includes(e.key) )
		logger.logGameStatus(data);
	else
		logger.logEvent(data);

	ws.send(data);
}
function onKeyDownEvent({ key }) {
	const data = {
		messageType: MessageTypes.KEY_CLICK,
		key: ( KeyCodes[key] ) ? KeyCodes[key] : key,
		keyCode: Number(key),
		time: Date.now()
	};

	// logger.logKey(data);
	ws.send(data);
}
function onMouseDownEvent(e) {
	const data = {
		messageType: MessageTypes.MOUSE_CLICK,
		time: Date.now(),
		...e
	};

	// logger.logKey(data);
	ws.send(data);
}
function onReplayCaptured(video) {
	console.log(...L('Replay captured:', video));

	const data = {
		messageType: MessageTypes.VIDEO,
		...video
	};

	logger.logReplay(data);
	ws.send(data);
}
function onHighlightCaptured(video) {
	console.log(...L('Highlight captured:', video));

	const data = {
		messageType: MessageTypes.VIDEO,
		...video
	};

	logger.logReplay(data);
	ws.send(data);
}
function getHotkey(name) { return new Promise(resolve => {
	overwolf.settings.getHotKey(name, r => {
		if ( r.status == 'success' && r.hotkey ) {
			resolve(r.hotkey);
		} else {
			console.error(...L(r));
			resolve(null);
		}
	});
})}
async function updateHotkey(name) {
	const
		key = 'hotkey/'+ name,
		oldVal = state[key],
		newVal = await getHotkey(name);

	if ( newVal !== oldVal )
		state[key] = newVal;
}
function updateHotkeys() {
	const promises = [];

	for ( let name of Object.values(Hotkeys) )
		promises.push(updateHotkey(name));

	return Promise.all(promises);
}
function registerHotkeys() {
	overwolf.settings.registerHotKey(Hotkeys.RECORD, e => {
		if ( e.status !== 'success' )
			return;

		recorder.toggleCapture();
	});
}
async function shareVideo(video) {
	state.videoToShare = video;
	await shareWin.restore();
}
async function showNotice(n) {
	n.uid = uuid();
	await messenger.openAndEmit('notice', 'showNotice', n);
}

start().catch((...args) => {
	console.error(...L(...args));
});
