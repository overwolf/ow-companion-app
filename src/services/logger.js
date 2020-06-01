export default class LoggerService {
	constructor() {
		this.root = overwolf.io.paths.documents;
		this.fileEncoding = 'UTF8';
		this.writePromises = {};
	}
	_fileExists(path) {
		return new Promise(r => overwolf.io.fileExists(path, r));
	}
	_readFile(path) {
		return new Promise(r => overwolf.io.readFileContents(path, this.fileEncoding, r));
	}
	_writeFile(path, content) {
		return new Promise(r => overwolf.io.writeFileContents(path, content, this.fileEncoding, true, r));
	}
	async _log(path, content) {
		if ( typeof content !== 'string' )
			throw 'log content must be string';

		const exists = await this._fileExists(path);

		if ( exists.status === 'success' && exists.found ) {
			const file = await this._readFile(path);

			if ( file.status === 'success' )
				await this._writeFile(path, file.content + content + '\r\n');
		} else {
			await this._writeFile(path, content + '\r\n');
		}
	}
	log(path, content) {
		const p = this.writePromises;

		content = JSON.stringify(content);

		if ( p[path] )
			p[path] = p[path].then(() => this._log(path, content));
		else
			p[path] = this._log(path, content);

		p[path] = p[path].then(() => p[path] = null);

		return p[path];
	}
	logGameStatus(content) {
		this.log(this.root +'/overwolf-companion/gameStatus.log', content);
	}
	logEvent(content) {
		this.log(this.root +'/overwolf-companion/events.log', content);
	}
	logReplay(content) {
		this.log(this.root +'/overwolf-companion/replays.log', content);
	}
}
