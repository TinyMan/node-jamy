const chai = require('chai');
const expect = chai.expect;
const { PassThrough } = require('stream')
const commandExistsSync = require('command-exists').sync;

const Jamy = require('../');

describe('Jamy', () => {
	let defaultJamy
	beforeEach(() => {
		defaultJamy = new Jamy()
	});
	it('should instanciate', done => {
		const options = { format: "s16le", channels: 1, frequency: 4800, bitDepth: 16 };
		const j = new Jamy(options);
		expect(j).to.have.property('playbackOptions')
		expect(j.playbackOptions).to.deep.equal(options)
		expect(j.stream).to.be.instanceOf(PassThrough)
		done()
	})
	it("should not be seekable with only a url or stream provided", done => {
		defaultJamy.play({
			url: "http://127.0.0.1/"
		})
		expect(defaultJamy.seekable).to.be.false
		defaultJamy.play({
			stream: new PassThrough()
		})
		expect(defaultJamy.seekable).to.be.false
		done()
	})
	it("should throw an error if no valid input is specified", done => {
		expect(defaultJamy.play.bind(defaultJamy)).to.throw("Invalid input")
		done()
	})
	describe(".currentTime", () => {
		it("should be 0 when no media is playing", done => {
			expect(defaultJamy.currentTime).to.be.equal(0)
			done()
		})
	})
	describe(".playing", () => {
		it("should be false when Jamy is not playing anything", done => {
			expect(defaultJamy.playing).to.be.false
			done()
		})
		it("should be false when Jamy is playing something", done => {
			defaultJamy.play({ url: "http://127.0.0.1/" })
			expect(defaultJamy.playing).to.be.true
			done()
		})
	})
	describe("events", () => {
		it("should emit play event", done => {
			defaultJamy.on('play', () => {
				expect(defaultJamy.playing).to.be.true
				done()
			})
			defaultJamy.play({ url: "http://127.0.0.1" })
		})
		it("should emit naturalEnd event", function (done) {
			if (!commandExistsSync('ffmpeg')) this.skip()
			defaultJamy.on('naturalEnd', () => {
				expect(defaultJamy.playing).to.be.false
				done()
			})
			const s = new PassThrough()
			defaultJamy.play({ stream: s })
			s.end()
		})
	})
	describe("seek", () => {
		it("should throw an error if stream is not seekable", done => {
			expect(defaultJamy.seek.bind(defaultJamy)).to.throw("Media is not seekable")
			done()
		})
	})
})

