const EventEmitter = require('events')
const ffmpeg = require('fluent-ffmpeg')
const TimedStream = require('timed-stream')
const debug = require('debug')('jamy:transcoder')


class Transcoder extends EventEmitter {
	constructor(options) {
		options = Object.assign({
			input: null,
			format: "s16le",
			channels: 1,
			frequency: 48000,
			bitDepth: 16,
			bypassRate: false
		}, options)
		if (!options.input) throw new Error('Invalid input')
		super()
		// console.log(options)
		this.ffmpegProcess = ffmpeg(options.input)
			.outputFormat(options.format)
			.audioChannels(options.channels)
			.audioFrequency(options.frequency)
			.on('error', e => { debug(e) })
		if (options.inputOptions) this.ffmpegProcess.inputOptions(options.inputOptions)
		if (options.outputOptions) this.ffmpegProcess.outputOptions(options.outputOptions)

		if (options.bypassRate) {
			this._rateControlled = false
			this._stream = this.ffmpegProcess.stream()
		} else {
			this._rateControlled = true
			this._stream = new TimedStream({
				rate: options.channels * options.frequency * options.bitDepth / 8,
				period: 100
			})
			this.ffmpegProcess.pipe(this._stream)
		}
	}
	get rateControlled() { return this._rateControlled }
	get stream() { return this._stream }
	kill(...args) { return this.ffmpegProcess.kill(...args) }
	stop() {
		this._stream.destroy()
		this._stream.unpipe()
		this._stream.removeAllListeners()
		this.kill()
	}
}

module.exports = Transcoder