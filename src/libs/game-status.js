import EventEmitter from './event-emitter'

class GameStatus extends EventEmitter {
constructor() {
	super()

	this.gameInfo	= null
	this.lastGameID	= null
	this.isInFocus	= false
	this.isRunning	= false

	this._onGameInfoUpdatedBound = this.onGameInfoUpdated.bind(this)
}
async start() {
	const gameInfo = await new Promise(r => overwolf.games.getRunningGameInfo(r))

	this.setGameInfo(gameInfo)

	this.isInFocus = !!(gameInfo && gameInfo.isInFocus)
	this.isRunning = !!(gameInfo && gameInfo.isRunning)

	overwolf.games.onGameInfoUpdated.addListener(this._onGameInfoUpdatedBound)
}
destroy() {
	overwolf.games.onGameInfoUpdated.removeListener(this._onGameInfoUpdatedBound)
}
onGameInfoUpdated(e) {
	const
		isInFocus = !!(e && e.gameInfo && e.gameInfo.isInFocus),
		isRunning = !!(e && e.gameInfo && e.gameInfo.isRunning),
		isInFocusChanged = ( isInFocus !== this.isInFocus ),
		isRunningChanged = ( isRunning !== this.isRunning )

	this.setGameInfo(e.gameInfo)

	if ( isInFocusChanged )
		this.isInFocus = isInFocus

	if ( isRunningChanged )
		this.isRunning = isRunning

	if ( isInFocusChanged )
		this.callListener('focus', this)

	if ( isRunningChanged )
		this.callListener('running', this)

	if ( e.resolutionChanged )
		this.callListener('resolution', this)

	if ( e.gameChanged )
		this.callListener('gameChange', this)

	if ( isInFocusChanged || isRunningChanged || e.resolutionChanged || e.gameChanged )
		this.callListener('*', this)
}
setGameInfo(gameInfo) {
	if ( gameInfo && gameInfo.isRunning ) {
		this.gameInfo = gameInfo
		this.lastGameID = Math.floor(gameInfo.id / 10)
	} else {
		this.gameInfo = null
	}
}
get gameId() {
	return this.gameID
}
get gameID() {
	if ( this.isRunning )
		return Math.floor(this.gameInfo.id / 10)
	else
		return this.lastGameID
}
gameIs(id) {
	return ( this.isRunning && this.gameID === id )
}
}

export default new GameStatus
