const rp = require('request-promise-native')

function parseRange(rangeString) {
	const arr = rangeString.split('-')
	return {
		start: parseInt(arr[0]),
		end: parseInt(arr[1])
	}
}
class MediaProvider {
	constructor(options) {
		options = Object.assign({
			url: null,
			cache: false,
			init: { start: 0, end: 0 },
			index: { start: 0, end: 0 }
		}, options)

		if (typeof options.init === "string") options.init = parseRange(options.init)
		if (typeof options.index === "string") options.index = parseRange(options.index)
		this.url = options.url
		this.cache = options.cache
		this.ranges = { init: options.init, index: options.index }
		this._init = null
		this._index = null
	}

	async getRange(start, end) {
		// get byte range from start (inclusive) to end (inclusive)

		// 1. check that 0 <= start < end
		if (start < 0 || start > end) throw new Error("Invalid range")

		const url = this.url
		const range = start + "-" + end
		const bytes = await rp({
			uri: url,
			headers: {
				"Range": "bytes=" + range
			},
			encoding: null // output into a buffer
		})
		return bytes
	}
	async getInit() {
		if (!this._init)
			this._init = await this.getRange(this.ranges.init.start, this.ranges.init.end)
		return this._init
	}
	async getIndex() {
		if (!this._index)
			this._index = await this.getRange(this.ranges.index.start, this.ranges.index.end)
		return this._index
	}
}

module.exports = MediaProvider