const EventEmitter = require('events')
const Stream = require('stream')
const mediaType = require('media-type');

const WebMFile = require('./WebMFile.js')
const MediaProvider = require('./MediaProvider.js')
const Transcoder = require('./Transcoder.js')

/**
 * Jamy is an audio player designed to stream MSE compatible files when possible.
 * Note that standart stream / non-mse compatible files will not be seekable.
 * Only MSE compatible WebM files allow seekability for now.
 * @extends {EventEmitter}
 */
class Jamy extends EventEmitter {

	/**
	 * @param {PlaybackOptions} [options] Options for the transcoder
	 */
	constructor(options) {
		super()
		options = Object.assign({
			format: "s16le",
			channels: 1,
			frequency: 48000,
			bitDepth: 16,
		}, options)

		/**
		* Playback options for the transcoder
		* @type {PlaybackOptions}
		*/
		this.playbackOptions = options

		this._stream = new Stream.PassThrough({ highWaterMark: 0 })
		this._file = null
		this._transcoder = null
		this._playing = false
		this._seekable = false
	}
	/**
	 * True if the stream is seekable
	 * @type {boolean}
	 * @readonly
	 */
	get seekable() { return this._seekable }
	/**
	 * The output stream
	 * @type {Stream.PassThrough}
	 * @readonly
	 */
	get stream() { return this._stream }
	/**
	 * The current time of the presentation, in seconds
	 * @type {number}
	 * @readonly
	 */
	get currentTime() {
		if (this._file && this._transcoder)
			return this._file.startTime + this._transcoder.stream.totalTime / 1000.0
		else
			return 0
	}
	/**
	 * True if Jamy is playing something
	 * @type {boolean}
	 * @readonly
	 */
	get playing() { return this._playing }
	/**
	 * Plays a media
	 * @param {MediaInfos} infos Describes the media source
	 */
	play(infos) {
		this._seekable = false
		// if we have a MIMI type
		const type = mediaType.fromString(infos.type)
		if (type.isValid() && type.subtype === "webm" && infos.index && infos.init && infos.url) {
			// we can parse webm
			const provider = new MediaProvider(infos)
			this._file = new WebMFile({ provider })
			this._seekable = true
			this.seek(0)
		} else if (infos.stream) {
			// stream provided
			this._play(infos.stream)
		} else if (infos.url) {
			// only url
			const opts = Object.assign({ inputOptions: ["-reconnect 1"] }, this.playbackOptions)
			this._play(infos.url, opts)
		} else {
			throw new Error("Invalid input")
		}

	}
	/**
	 * Stops the playback and kill transcoder
	 */
	stop() {
		if (this._playing) {
			if (this._transcoder) {
				this._transcoder.stop()
			}
			this._playing = false
			this.emit("stop")
		}
	}

	/**
	 * Resumes the playback
	 */
	resume() {
		this._transcoder.resume()
		this.emit("resume")
	}
	/**
	 * Pauses the playback
	 */
	pause() {
		this._transcoder.pause()
		this.emit("pause")
	}
	/**
	 * Seeks the given time in seconds
	 * If the media is not seekable, does nothing but emit and error
	 * @param {number} time Timecode in seconds. If negative, timecode will be substracted from the end
	 */
	seek(time) {
		if (!this.seekable) return this.emit('error', new Error('Media is not seekable'))
		this._play(this._file.stream(time))
	}
	_play(input, options = this.playbackOptions) {
		this.stop()
		this._playing = true
		options.input = input

		// creates new transcoder
		this._transcoder = new Transcoder(options)
		this._transcoder.stream.pipe(this._stream, { end: false })
		this._transcoder.stream.on('end', this._onEnd.bind(this))

		this.emit("play")
	}
	_onEnd() {
		this._playing = false
		this.emit('naturalEnd')
	}
}

module.exports = Jamy