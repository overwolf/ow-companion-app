const
	path = require('path'),
	fs = require('fs'),
	WebSocket = require('ws'),
	tcpPortUsed = require('tcp-port-used'),
	originAllowed = 'overwolf-extension://cilmdpjkknobfeoafdccgdghccbpdjgachkmnkgi',
	userAgentAllowed = 'OverwolfClient',

	portFileDir = path.resolve(`${process.env.ProgramData}${path.sep}OverwolfCompanion`),
	portFilePath = path.resolve(`${portFileDir}${path.sep}ws`),

	portStart = 5679,
	portRange = 20

async function start() {
	const port = await getFreePort()

	const server = new WebSocket.Server({ host: 'localhost', port })

	await writePort(port);

	console.log('WebSocket server listening')

	server.on('connection', onConnection)

	server.on('error', error => {
		console.log('WebSocket error:', error)
	})
}

async function getFreePort() {
	const maxPort = portStart + portRange

	let port = portStart

	while ( port < maxPort ) {
		const isFree = !(await tcpPortUsed.check(port))

		console.log(`port ${port} is free: ${isFree}`)

		if ( isFree )
			return port

		port++
	}

	throw `no free port found`
}

async function writePort(port) {
	if ( !(await dirExists(portFileDir)) )
		await makeDir(portFileDir)

	await writeFile(portFilePath, JSON.stringify({ port }))
}

function dirExists(pth) { return new Promise((resolve, reject) => {
	fs.stat(pth, (err, stats) => err ? resolve(false) : resolve(stats.isDirectory()))
})}

function makeDir(pth) { return new Promise((resolve, reject) => {
	fs.mkdir(pth, err => err ? reject(err) : resolve())
})}

function writeFile(filepath, contents) { return new Promise((resolve, reject) => {
	fs.writeFile(filepath, contents, 'utf8', err => err ? reject(err) : resolve())
})}

function isValidClient(headers) {
	return ( headers.origin === originAllowed && headers['user-agent'].includes(userAgentAllowed) )
}

function onConnection(socket, { headers }) {
	if ( !isValidClient(headers) ) {
		console.log('New connection not accepted', {
			host		: headers.host,
			origin		: headers.origin,
			userAgent	: headers['user-agent']
		})

		socket.terminate()
		return
	}

	console.log('New connection accepted', {
		host		: headers.host,
		origin		: headers.origin,
		userAgent	: headers['user-agent']
	})

	socket.on('message', onMessage)

	// You can send messages to the client now (e.g. to share a video you received before)
	// socket.send(JSON.stringify({ messageType: 'SHARE_VIDEO', ...videoObject }))
}
function onMessage(message) {
	try {
		console.log('Received message:', JSON.parse(message))
	} catch (e) {
		console.log('Received message:', message)
	}
}

start()
