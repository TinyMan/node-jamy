const Stream = require('stream')
const EventEmitter = require('events')
const ebml = require('ebml')
const debug = require('debug')('jamy:webm-file')

class ParseError extends Error { }

function parseUint(buf) {
	if (buf.length > 8) throw new ParseError("Buffer too large for UInt64 (" + buf.length + ")")
	let value = 0
	for (let i = 0; i < buf.length; i++) {
		value = (value << 8) | buf[i]
	}
	return value
}
function parseInt(buf) {
	if (buf.length > 8) throw new ParseError("Buffer too large for Int64 (" + buf.length + ")")
	let value = 0
	if (buf[0] & 0x80 != 0) {
		value = -1
	}
	for (let i = 0; i < buf.length; i++) {
		value = (value << 8) | buf[i]
	}
	return value
}
function parseFloat(buf) {
	if (buf.length === 4) return buf.readFloatBE(0)
	else if (buf.length === 8) return buf.readDoubleBE(0)
	else throw new ParseError("Invalid length for float or double (" + buf.length + ")")
}
function parseString(buf) {
	return buf.toString()
}
// greatly inspired by https://github.com/acolwell/mse-tools for parsing
class WebMFile extends EventEmitter {
	constructor(options) {
		super(options)
		options = Object.assign({
			provider: null,
			init: null,
			index: null
		}, options)

		// seek the nearest preceding cluster		
		this.fastSeek = true
		// if the requested time is > (next cluster start - epsilon), start at the next cluster
		this.epsilon = 0.5 // in seconds

		this.provider = options.provider
		this.manifest = { media: [], cues: [] }
		this._init = options.init
		this._index = options.index
		this.timecodeScale = 0
		this.vcodec = ""
		this.acodec = ""
		this.duration = -1
		this.headerOffset = -1
		this.headerSize = -1

		// temp variable used by parser
		this._clusterOffset = -1
		this._clusterTimecode = 0
		this._cueClusterPosition = -1
		this._cueTime = 0
		this._cueTrack = 1

		// is parsing of the index finished ?
		this.finished = false
		this.on('finish', () => {
			this.finished = true
		})
		this.ebmlDecoder = new ebml.Decoder()
		this.ebmlDecoder.on('data', data => this._parseTag(data))
		this.startTime = 0
	}
	set init(init) {
		this.start = Date.now()
		this._init = init
		this.ebmlDecoder.write(this._init)
	}
	get init() { return this._init }
	set index(index) {
		this._index = index
		this.ebmlDecoder.write(this._index)
	}
	get index() { return this._index }
	_writeToStream(stream, time) {
		const self = this
		// calcul de l'offset de départ
		let clusterId = this.getClusterIdAt(time)
		this.startTime = this.manifest.cues[clusterId].timecode
		stream.write(this._init)
		stream.on('drain', next)
		next()

		async function next() {
			if (clusterId >= self.manifest.cues.length) {
				stream.end()
			} else {
				const cluster = self.manifest.cues[clusterId++]
				const data = await self.provider.getRange(cluster.start, cluster.end)

				if (stream.write(data)) return next()
			}
		}
	}
	/**
	 * @return a stream of the file starting at timecode
	 */
	stream(timecode = 0) {
		if (!this.provider) throw new Error("No MediaProvider provided")

		const stream = new Stream.PassThrough() //new ebml.Encoder()
		if (this.finished) {
			this._writeToStream(stream, timecode)
		} else {
			this.once('finish', () => this._writeToStream(stream, timecode))
			this.provider.getInit()
				.then(i => this.init = i)
				.then(() => this.provider.getIndex())
				.then(i => this.index = i)
				.catch(e => debug(e))
		}
		return stream
	}
	getClusterIdAt(time) {
		if (time < 0) time = this.manifest.duration + time
		if (time < 0 || time > this.manifest.duration) return 0
		let i = 1
		for (i; i < this.manifest.cues.length; i++) {
			if (this.manifest.cues[i].timecode - this.epsilon > time) break;
		}
		return i - 1;
	}

	_parseTag(tag) {
		// parse tag
		const end = tag[0] === 'end'
		tag = tag[1]
		switch (tag.type) {
			case 'b':
				this._onBinary(tag.name, tag.data)
				break;
			case 'u':
				this._onUint(tag.name, parseUint(tag.data))
				break;
			case 'i':
				this._onInt(tag.name, parseInt(tag.data))
				break;
			case 'f':
				this._onFloat(tag.name, parseFloat(tag.data))
				break;
			case 's':
			case '8':
				this._onString(tag.name, parseString(tag.data))
				break;
			case 'm':
				if (end) this._onListEnd(tag, tag.name)
				else this._onListStart(tag, tag.name)
				break
			default: throw new ParseError('Unknown type ' + tag.type)
		}
	}
	_onBinary(id, value) { }
	_onInt(id, value) { }
	_onUint(id, value) {
		if (id === 'TimecodeScale') {
			this.timecodeScale = value
		}
		else if (id === 'Timecode') {
			this._clusterTimecode = value
		}
		else if (id === 'DateUTC') {
			this.manifest.StartDate = new Date(value)
		}
		else if (id === 'CueTrack') {
			this._cueTrack = value
		}
		else if (id === 'CueClusterPosition') {
			this._cueClusterPosition = value + this.seekHeadOffset
		}
		else if (id === 'CueTime') {
			this._cueTime = value
		}
	}
	_onFloat(id, value) {
		if (id === 'Duration') {
			this.duration = value
		}
	}
	_onString(id, value) {
		if (id === 'CodecID') {
			switch (value) {
				case "V_VP8":
					this.vcodec = "vp8"
					break
				case "V_VP9":
					this.vcodec = "vp9"
					break
				case "A_VORBIS":
					this.acodec = "vorbis"
					break
				case "A_OPUS":
					this.acodec = "opus"
					break
			}
		}
	}

	_onListStart(tag, id) {
		if (id === 'EBML') {
			if (this.headerSize !== -1)
				throw new ParseError('Invalid second header tag')
			this.headerOffset = tag
			this.headerSize = -1
			this.vcodec = ""
			this.acodec = ""
		} else if (id === 'Cluster') {
			if (this.headerSize === -1) {
				this.headerSize = tag.start - this.headerOffset
				this.manifest.init = { offset: this.headerOffset, size: this.headerSize }
			}
			this._clusterOffset = tag.start
		} else if (id === "SeekHead") this.seekHeadOffset = tag.start
		else if (id === "Segment") this.segmentEnd = tag.end

	}
	_onListEnd(tag, id) {
		const scaleMult = this.timecodeScale / 1000000000.0

		if (id === 'Info') {
			if (this.timecodeScale === 0) {
				this.timecodeScale = 1000000
			}
			if (this.duration !== -1) {
				this.manifest.duration = this.duration * scaleMult
			}
		}

		else if (id === 'Tracks') {
			let contentType = ""
			if (this.vcodec !== "" && this.acodec !== "") {
				contentType = `video/webm;codecs="${this.vcodec},${this.acodec}"`
			} else if (this.vcodec !== "" && this.acodec === "") {
				contentType = `video/webm;codecs=${this.vcodec}`
			} else if (this.vcodec === "" && this.acodec !== "") {
				contentType = `audio/webm;codecs=${this.acodec}`
			}

			this.manifest.Type = contentType
		}

		else if (id === 'Cluster') {
			this.manifest.media.push({
				start: this._clusterOffset,
				end: tag.end,
				timecode: this._clusterTimecode * scaleMult
			})
		}
		else if (id === 'CuePoint') {
			if (this.manifest.cues.length)
				this.manifest.cues[this.manifest.cues.length - 1].end = this._cueClusterPosition - 1
			this.manifest.cues.push({
				timecode: this._cueTime * scaleMult,
				// track: this._cueTrack,
				start: this._cueClusterPosition,
				end: this.segmentEnd
			})
		}
		else if (id === 'Cues') {
			this.emit('finish')
		}

		else if (id === 'Segment') {
			this.emit('finish')
		}
	}
}

module.exports = WebMFile