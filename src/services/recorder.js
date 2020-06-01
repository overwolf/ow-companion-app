import uuid from 'uuid'
import moment from 'moment'
import binder from '@/libs/binder.js'
import EventEmitter from '@/libs/event-emitter.js'
import { objectCopy, L } from '@/libs/utils.js'
import { getPersistentState } from '@/libs/state-server.js'
import gameStatus from '@/libs/game-status.js'
import TimelineTypes from '@/constants/timeline-types.js'
import VideoTypes from '@/constants/video-types.js'
import { MatchStartEvents, MatchEndEvents } from '@/constants/match-events.js'
import GameEventsInfo from '@/constants/game-events-info.js'

const ReplayTypes = {
	video: 'Video',
	gif: 'gif'
};

const
	persState	= getPersistentState(),
	API			= overwolf.media.replays,
	videosAPI	= overwolf.media.videos;

export default class RecorderService extends EventEmitter {
constructor() {
	super();

	this._bound = binder(this);

	this.maxVideoFolderSize = 2; // 2 GB
	this.session = null;
	this.capturePath = null;
	this.gameWidth = null;
	this.gameHeight = null;
}
async start() {
	await gameStatus.start();

	if ( gameStatus.isRunning )
		await this.onGameLaunched();

	gameStatus.on({
		running		: this._bound.onGameRunningChange,
		resolution	: this._bound.onGameResolutionChanged,
	}, this);

	API.onCaptureError.addListener(e => console.log(...L('overwolf.media.replays.onCaptureError()', e)));
	API.onCaptureWarning.addListener(e => console.log(...L('overwolf.media.replays.onCaptureWarning()', e)));

	await this.trimOldVideos();
}
async turnOn() {
	const state = await this.getState();

	console.log(...L('recorder.turnOn()', state));

	if ( state.status === 'success' && !state.isOn )
		await this._turnOn();
}
_turnOn() { return new Promise((resolve, reject) => {
	const { gameInfo, isRunning } = gameStatus;

	if ( !isRunning )
		return reject('game not running');

	if ( !gameInfo )
		return reject('no gameInfo');

	if ( !gameInfo.allowsVideoCapture )
		return reject('game does not allow video capture');

	API.turnOn({
		settings: {
			video: {
				sub_folder_name: moment().format('HH mm ss DD.MM.Y'),
				buffer_length: 42000,
				disable_when_sht_not_supported: true
			}
		},
		highlights: {
			enable: true,
			requiredHighlights: ['*']
		}
	}, result => {
		console.log(...L('recorder._turnOn()', result));

		if ( result && result.status === 'success' )
			resolve(result);
		else
			reject(result);
	});
})}
async turnOff() {
	const state = await this.getState();

	console.log(...L('recorder.turnOff()', state));

	if ( state.status === 'success' && state.isOn )
		await this._turnOff();
}
_turnOff() { return new Promise(resolve => {
	API.turnOff((...args) => {
		console.log(...L('recorder._turnOff()', ...args));
		resolve(...args);
	});
})}
getVideosSize() { return new Promise((resolve, reject) => {
	videosAPI.getVideosSize(result => {
		if ( result && result.status === 'success' && typeof result.totalSizeGbs === 'number' )
			resolve(result.totalSizeGbs);
		else
			reject(result);
	});
})}
getState() { return new Promise(resolve => {
	API.getState(ReplayTypes.video, resolve);
})}
_startCapture(pastDuration) { return new Promise(resolve => {
	API.startCapture(ReplayTypes.video, pastDuration, resolve);
})}
_stopCapture(path) { return new Promise(resolve => {
	API.stopCapture(ReplayTypes.video, path, resolve);
})}
async startCapture(pastDuration = 0) {
	const result = await this._startCapture();
	console.log(...L('recorder.startCapture()', result));

	if ( result.status === 'success' && result.path ) {
		this.emit('recordingStarted');
		this.capturePath = result.path;
	}
}
async stopCapture() {
	const { capturePath } = this;

	this.capturePath = null;

	const result = await this._stopCapture(capturePath);

	if ( result.status === 'success' ) {
		this.emit('recordingEnded');
		this.onReplayCaptured(result);
	}
}
async toggleCapture() {
	const state = await this.getState();

	if ( state.status !== 'success' || !state.isOn ) {
		console.log(...L('recorder.toggleCapture(): cannot capture:', state));
		return;
	}

	if ( this.capturePath )
		await this.stopCapture();
	else
		await this.startCapture();
}
onReplayCaptured(r) {
	if ( !this.session )
		return;

	this.session.hasVideos = true;

	const { uid, gameInfo } = this.session;

	const data = {
		gameSessionUID			: uid,
		videoType				: VideoTypes.REPLAY,
		eventType				: TimelineTypes.VIDEO,
		time					: r.start_time,
		endTime					: r.start_time + r.duration,
		duration				: r.duration,
		url						: r.url,
		path					: r.path,
		encodedPath				: r.encodedPath,
		thumbnailUrl			: r.thumbnail_url,
		thumbnailPath			: r.thumbnail_path,
		thumbnailEncodedPath	: r.thumbnail_encoded_path
	};

	this.emit('replayCaptured', { gameInfo, ...data });

	this.session.timeline.push(data);
}
onHighlightCaptured(hl) {
	if ( !this.session )
		return;

	const { uid, gameInfo } = this.session;

	this.session.hasVideos = true;

	const data = {
		gameSessionUID			: uid,
		videoType				: VideoTypes.HIGHLIGHT,
		eventType				: TimelineTypes.VIDEO,
		time					: hl.replay_video_start_time,
		endTime					: hl.replay_video_start_time + hl.duration,
		duration				: hl.duration,
		url						: hl.media_url,
		path					: hl.media_path,
		encodedPath				: hl.media_path_encoded,
		thumbnailUrl			: hl.thumbnail_url,
		thumbnailPath			: hl.thumbnail_path,
		thumbnailEncodedPath	: hl.thumbnail_encoded_path,
		events					: hl.events,
		rawEvents				: hl.raw_events
	};

	this.emit('highlightCaptured', { gameInfo, ...data });

	this.session.timeline.push(data);
}
startGameSession() {
	const { gameID, gameInfo } = gameStatus;

	const time = Date.now();

	this.session = {
		uid: uuid(),
		gameID,
		gameInfo	: objectCopy(gameInfo),
		gameTitle	: gameInfo.title,
		time		: time,
		timeline	: [],
		hasVideos	: false
	};

	if ( GameEventsInfo[gameID] )
		this.emit('gameSessionStarted');

	console.log(...L('recorder.startGameSession()', this.session));
}
endGameSession() {
	if ( !this.session )
		return;

	const
		{ session } = this,
		{ uid, gameID, gameTitle, gameInfo, time, hasVideos } = session,
		{ sessions: storedSessions = [] } = persState;

	if ( !hasVideos ) {
		this.session = null;
		return;
	}

	delete session.hasVideos;

	const
		endTime = Date.now(),
		duration = endTime - time;

	Object.assign(session, { endTime, duration });

	storedSessions.unshift({ uid, gameID, gameTitle, time, endTime, duration });

	persState[`session/${uid}`] = session;
	persState.sessions = storedSessions;

	this.session = null;

	if ( GameEventsInfo[gameID] )
		this.emit('gameSessionEnded');

	console.log(...L('recorder.endGameSession()', session));
}
onMatchStarted() {
	if ( !this.session )
		return;

	const { timeline } = this.session;

	const
		matches = timeline.filter(({eventType}) => (eventType === TimelineTypes.MATCH)),
		previousMatch = matches[matches.length - 1],
		time = Date.now();

	if ( previousMatch && !previousMatch.endTime ) {
		const duration = time - previousMatch.time;
		Object.assign(previousMatch, { endTime: time, duration }); // stop previous match if it was still running
	}

	timeline.push({ time, eventType: TimelineTypes.MATCH });

	console.log('recorder.onMatchStarted()');
}
onMatchStopped() {
	if ( !this.session )
		return;

	const { timeline } = this.session;

	if ( !timeline || !timeline.length )
		return;

	const
		matches = timeline.filter(({eventType}) => (eventType === TimelineTypes.MATCH)),
		currentMatch = matches[matches.length - 1],
		endTime = Date.now();

	if ( currentMatch && !currentMatch.endTime ) {
		const duration = endTime - currentMatch.time;
		Object.assign(currentMatch, { endTime, duration });
	}

	console.log(...L('recorder.onMatchStopped()', currentMatch));
}
onGameEvent({ path, category, key, val }) {
	if ( !this.session )
		return;

	const { gameID } = this.session;

	if ( MatchStartEvents.includes(key) ) {
		this.onMatchStarted();
	} else if ( MatchEndEvents.includes(key) ) {
		this.onMatchStopped();
	} else if (
		this.session
		&& category === 'events'
		&& GameEventsInfo[gameID]
		&& GameEventsInfo[gameID][key]
	) {
		this.session.timeline.push({
			key,
			val,
			time: Date.now(),
			eventType: TimelineTypes.GAME_EVENT
		});
	}
}
onGameRunningChange() {
	if ( gameStatus.isRunning )
		this.onGameLaunched();
	else
		this.onGameClosed();
}
async onGameResolutionChanged(e) {
	if ( !e || !e.gameInfo )
		return;

	if ( this.gameWidth === e.gameInfo.width && this.gameHeight === e.gameInfo.height )
		return;

	this.gameWidth = e.gameInfo.width;
	this.gameHeight = e.gameInfo.height;

	console.log(...L('recorder.onGameResolutionChanged()', e));

	await this.turnOff();
	await this.turnOn();
}
async onGameLaunched() {
	API.onHighlightsCaptured.addListener(this._bound.onHighlightCaptured);

	try {
		const { gameInfo } = gameStatus;

		this.gameWidth = gameInfo.width;
		this.gameHeight = gameInfo.height;

		await this.turnOn();

		this.startGameSession();
	} catch (e) {
		console.log(...L('recorder.onGameLaunched(): error:', e));
	}
}
async onGameClosed() {
	API.onHighlightsCaptured.removeListener(this._bound.onHighlightCaptured);

	try {
		this.gameWidth = null;
		this.gameHeight = null;

		await this.stopCapture();

		this.endGameSession();

		await Promise.all([
			this.turnOff(),
			this.trimOldVideos()
		]);

	} catch (e) {
		console.log(...L('recorder.onGameClosed(): error:', e));
	}
}
async trimOldVideos() {
	const videosSize = await this.getVideosSize();

	if ( videosSize > this.maxVideoFolderSize ) {
		const result = await new Promise(resolve => {
			videosAPI.deleteOldVideos(this.maxVideoFolderSize, resolve);
		});

		console.log(...L('recorder.trimOldVideos():', result));
	}
}
}
