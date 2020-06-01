export default {
	position: {
		type: String,
		default: 'center bottom'
	},
	arrowPosition: {
		type: [String, null],
		default: null
	},
	adjust: {
		type: [Array, null],
		default: null,
		validator(v) {
			return (v === null || (Array.isArray(v) && v.length === 2));
		}
	},
	adjustArrow: {
		type: [Array, null],
		default: null,
		validator(v) {
			return (v === null || (Array.isArray(v) && v.length === 2));
		}
	},
	type: {
		type: String,
		default: ''
	}
}
