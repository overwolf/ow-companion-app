export default parent => new Proxy({ parent, methods: {} }, {
	has(t, prop) {
		return ( t.methods[prop] !== undefined )
	},
	get(t, prop) {
		if ( t.methods[prop] === undefined )
			return t.methods[prop] = t.parent[prop].bind(t.parent)
		else
			return t.methods[prop]
	},
	set(t, prop, value) {
		return true
	},
	deleteProperty(t, prop) {
		delete t.methods[prop]
		return true
	},
	ownKeys() {
		return []
	}
})
