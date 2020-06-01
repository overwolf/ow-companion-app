const
	API = overwolf.windows,
	utilsAPI = overwolf.utils;

const
	CURRENT_WINDOW_NAME = 'current',
	NOT_CURRENT_WINDOW = 'method does not support windows other than current';

const publicMethods = [
	{
		name: 'restore'
	},
	{
		name: 'minimize'
	},
	{
		name: 'maximize'
	},
	{
		name: 'hide'
	},
	{
		name: 'changeSize',
		args: 2
	},
	{
		name: 'changePosition',
		args: 2
	},
	{
		name: 'dragMove'
	},
	{
		name: 'getWindowState'
	},
	{
		name: 'setTopmost'
	},
	{
		name: 'sendToBack'
	},
	{
		name: 'bringToFront'
	},
	{
		name: 'setDesktopOnly'
	},
	{
		name: 'setPosition'
	}
];

export default class OverwolfWindow {
	constructor(name = CURRENT_WINDOW_NAME) {
		this.name		= name;
		this.id			= null;
		this.isCurrent	= ( name === CURRENT_WINDOW_NAME );
	}
	obtain() { return new Promise((resolve, reject) => {
		const cb = res => {
			if ( isSuccess(res) && res.window && res.window.id ) {
				this.id = res.window.id;
				this.name = res.window.name;

				resolve(res.window);
			} else {
				this.id = null;

				reject(new OverwolfWindowError({
					method: 'obtain',
					result: res,
					args: [ this.name ],
					win: this
				}));
			}
		};

		if ( this.isCurrent )
			API.getCurrentWindow(cb);
		else
			API.obtainDeclaredWindow(this.name, cb);
	})}
	isWindowVisibleToUser() {
		if ( !this.isCurrent )
			throw new Error(NOT_CURRENT_WINDOW);

		return new Promise((resolve, reject) => {
			API.isWindowVisibleToUser(res => {
				if ( isSuccess(res) && res.visible )
					resolve(res.visible);
				else
					reject(res);
			})
		});
	}
	async dragResize(edge, rect = { top: 0, left: 0, right: 0, bottom: 0 }) {
		await this.obtain();

		await new Promise((resolve, reject) => {
			API.dragResize(this.id, edge, rect, res => {
				if ( isSuccess(res) ) {
					resolve(res);
				} else {
					reject(new OverwolfWindowError({
						method: 'dragResize',
						args: [ this.id, edge, rect ],
						result: res,
						win: this
					}));
				}
			});
		});
	}
	async close() {
		const win = await this.obtain();

		if ( win && win.stateEx !== 'closed' ) {
			await new Promise((resolve, reject) => {
				API.close(this.id, res => {
					if ( isSuccess(res) ) {
						resolve(res);
					} else {
						reject(new OverwolfWindowError({
							method: 'close',
							args: [ this.id ],
							result: res,
							win: this
						}));
					}
				});
			});
		}
	}
	async dragMoveRestrained() {
		const [
			win,
			dragResult,
			viewport
		] = await Promise.all([
			this.obtain(),
			this.dragMove(),
			OverwolfWindow.getViewportSize()
		]);

		const
			left	= win.left + dragResult.horizontalChange,
			top		= win.top + dragResult.verticalChange;

		let newLeft	= left,
			newTop	= top;

		if ( left + win.width > viewport.width )
			newLeft = viewport.width - win.width;

		if ( top + win.height > viewport.height )
			newTop = viewport.height - win.height;

		newLeft	= Math.max(newLeft, 0);
		newLeft	= Math.floor(newLeft);

		newTop	= Math.max(newTop, 0);
		newTop	= Math.floor(newTop);

		const out = {
			viewport,
			position: {
				left: newLeft,
				top: newTop
			}
		};

		if ( left !== newLeft || top !== newTop )
			await this.changePosition(newLeft, newTop);

		return out;
	}
	async center() {
		const [win, viewport] = await Promise.all([this.obtain(), OverwolfWindow.getViewportSize()]);

		let left	= (viewport.width / 2) - (win.width / 2),
			top		= (viewport.height / 2) - (win.height / 2);

		left	= Math.max(left, 0);
		top		= Math.max(top, 0);

		left	= Math.floor(left);
		top		= Math.floor(top);

		await this.changePosition(left, top);
	}
	setMute(mute) {
		if ( !this.isCurrent )
			throw new Error(NOT_CURRENT_WINDOW);

		return new Promise(resolve => {
			API.setMute(mute, resolve);
		});
	}
	isMuted() {
		if ( !this.isCurrent )
			throw new Error(NOT_CURRENT_WINDOW);

		return new Promise(resolve => {
			API.isMuted(resolve);
		});
	}
	isAcceleratedOSR() {
		if ( !this.isCurrent )
			throw new Error(NOT_CURRENT_WINDOW);

		return new Promise((resolve, reject) => {
			API.isAcceleratedOSR(res => {
				if ( isSuccess(res) )
					resolve(res);
				else
					reject(res);
			});
		});
	}
	static getWindowsStates() { return new Promise(resolve => {
		API.getWindowsStates(resolve);
	})}
	static getViewportSize() { return new Promise((resolve, reject) => {
		utilsAPI.getMonitorsList(result => {
			let width = null,
				  height = null;

			for ( let display of result.displays ) {
				if ( display.is_primary ) {
					width = display.width;
					height = display.height;
				}
			}

			overwolf.games.getRunningGameInfo(game => {
				if ( game && game.isInFocus ) {
					width = game.logicalWidth;
					height = game.logicalHeight;
				}

				if ( width !== null && height !== null )
					resolve({ width, height });
				else
					reject(new Error('could not get monitors width/height'));
			});
		});
	})}
	static getMonitorsList() { return new Promise(resolve => {
		utilsAPI.getMonitorsList(resolve);
	})}
  static getDPIScale() { return new Promise(resolve => {
    API.getWindowDPI(result => resolve(result.scale));
  })}
	static getOpenWindows() { return new Promise(resolve => {
		API.getOpenWindows(resolve);
	})}
	static muteAll() { return new Promise(resolve => {
		API.muteAll(resolve);
	})}
	static displayMessageBox(messageParams) { return new Promise(resolve => {
		API.displayMessageBox(messageParams, resolve);
	})}
}

export class OverwolfWindowError extends Error {
	constructor({ method = 'unknown', result: { status = 'unknown', error = 'unknown' }, win = null, args = [] }) {
		let message = `${method} ${status}: "${error}" `;

		if ( args && args.length )
			message += `args: ${JSON.stringify(args)} `;

		message += `window: ${JSON.stringify(win)}`;

		super(message);

		this.name = 'OverwolfWindowError';

		if ( Error.captureStackTrace )
			Error.captureStackTrace(this, OverwolfWindowError);
	}
}

function isSuccess(res) {
	return (res && (res.success || res.status === 'success'));
}

function internalAPICall(method, winID, args) {
	return new Promise(resolve => API[method](winID, ...args, resolve));
}

function getPublicMethod(method) { return async function(...args) {
	if ( method.args !== undefined )
		args = args.slice(0, method.args);

	await this.obtain();

	const res = await internalAPICall(method.name, this.id, args);

	if ( isSuccess(res) )
		return res;

	throw new OverwolfWindowError({
		method: method.name,
		args: [ this.id, ...args ],
		result: res,
		win: this
	});
}}

publicMethods.forEach(m => {
	OverwolfWindow.prototype[m.name] = getPublicMethod(m);
});
