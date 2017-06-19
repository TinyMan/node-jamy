const chai = require('chai');
const expect = chai.expect;
const rewire = require('rewire');
const fs = require('fs');

const WebMFile = rewire('../lib/WebMFile.js');
const MediaProvider = require('../lib/MediaProvider.js');
const { Readable } = require('stream');

describe('WebMFile', () => {
	const parseInt = WebMFile.__get__('parseInt');
	const parseUint = WebMFile.__get__('parseUint');
	const parseFloat = WebMFile.__get__('parseFloat');
	const parseString = WebMFile.__get__('parseString');
	const ParseError = WebMFile.__get__('ParseError');
	it('should instanciate', done => {
		expect(new WebMFile()).to.be.instanceOf(WebMFile)
		done()
	})
	it('should correclty parse a cluster index', done => {
		const file = new WebMFile()
		const manifest = require(__dirname + '/samples/index-webm.manifest.json')
		file.on('finish', () => {
			expect(file.manifest).to.be.deep.equal(manifest)
			done()
		})
		file.index = fs.readFileSync(__dirname + '/samples/index.webm')
	});
	it('should correctly parse Vorbis and VP8 codec string', done => {
		const file = new WebMFile()
		file.once('finish', () => {
			expect(file.manifest.Type).to.be.equal("video/webm;codecs=\"vp8,vorbis\"")
			done()
		})
		file.index = fs.readFileSync(__dirname + '/samples/small-vp8-vorbis.webm')
	});
	it('should be possible to set/get init and index segments', done => {
		const file = new WebMFile()
		file.init = Buffer.alloc(0)
		file.index = Buffer.alloc(0)
		expect(file.init).to.be.equal(file.init)
		expect(file.index).to.be.equal(file.index)
		done()
	});
	describe('parseInt', () => {
		it('should correclty parse Int8', done => {
			const b = Buffer.alloc(1)
			b.writeInt8(127)
			expect(parseInt(b)).to.be.equal(127)
			done()
		})
		it('should correclty parse Int16', done => {
			const b = Buffer.alloc(2)
			b.writeInt16BE(1024)
			expect(parseInt(b)).to.be.equal(1024)
			done()
		})
		it('should correclty parse Int32', done => {
			const b = Buffer.alloc(4)
			b.writeInt32BE(0x7FFFFFFF)
			expect(parseInt(b)).to.be.equal(0x7FFFFFFF)
			done()
		})
		it('should correclty parse negative int', done => {
			const b = Buffer.alloc(4)
			b.writeInt32BE(-200)
			expect(parseInt(b)).to.be.equal(-200)
			done()
		})
	});
	describe('parseUint', () => {
		it('should correclty parse UInt8', done => {
			const b = Buffer.alloc(1)
			b.writeUInt8(255)
			expect(parseUint(b)).to.be.equal(255)
			done()
		})
		it('should correclty parse UInt16', done => {
			const b = Buffer.alloc(2)
			b.writeUInt16BE(0xFFFF)
			expect(parseUint(b)).to.be.equal(0xFFFF)
			done()
		})
		it('should correclty parse UInt32', done => {
			const b = Buffer.alloc(4)
			b.writeUInt32BE(0xFFFFF)
			expect(parseUint(b)).to.be.equal(0xFFFFF)
			done()
		})
	});
	describe('parseFloat', () => {
		it('should correclty parse Float', done => {
			const b = Buffer.alloc(4)
			b.writeFloatBE(50)
			expect(parseFloat(b)).to.be.equal(50)
			done()
		})
		it('should correclty parse Double', done => {
			const b = Buffer.alloc(8)
			b.writeDoubleBE(10.5)
			expect(parseFloat(b)).to.be.equal(10.5)
			done()
		})
		it('should throw a ParseError when trying to parse invalid sized buffer', done => {
			const b = Buffer.alloc(7)
			expect(() => parseFloat(b)).to.throw(ParseError)
			done()
		})
	});
	describe("parseString", () => {
		it('should correctly parse a string', done => {
			expect(parseString("test string")).to.be.equal('test string');
			done()
		})
	});

	describe('.stream(time)', () => {
		it("should return a Readable stream instance", done => {
			const mp = new MediaProvider()
			mp.getRange = function () { return Buffer.alloc(0) }
			const file = new WebMFile({ provider: mp })
			expect(file.stream()).to.be.instanceof(Readable)
			done()
		})
		it('should emit the error when MediaProvider cannot get init or index segments', done => {
			const file = new WebMFile()
			const provider = new MediaProvider()
			file.provider = provider
			file.on('error', () => done())
			file.stream()
		});
		it("should stream init segment followed by the media clusters", done => {
			const mp = new MediaProvider()
			mp.getRange = function (start, end) {
				const b = Buffer.alloc(end - start)
				// for (let i = 0; i < b.length; i++)
				// 	b[i] = i
				return b
			}
			const file = new WebMFile({ provider: mp })
			file.init = fs.readFileSync(__dirname + '/samples/index.webm')
			const output = file.stream()
			let finished = false
			let c = 0
			output.on('data', data => {
				for (let i = 0; i < data.length && c < file.init.length; i++ , c++) {
					expect(data[i]).to.be.equal(file.init[c])
				}
				if (c >= file.init.length) finished = true
			})
			output.on('end', () => {
				expect(finished).to.be.true
				done()
			})
		})

	})
	describe('.getClusterIdAt(time)', () => {
		let file;
		before(done => {
			file = new WebMFile()
			file.on('finish', done)
			file.init = fs.readFileSync(__dirname + '/samples/index.webm')
		});
		it('should return the last id if time is > max', done => {
			expect(file.getClusterIdAt(2500)).to.be.equal(file.manifest.cues.length - 1)
			done()
		})
		it('should return 0 if abs(time) > max and time < 0', done => {
			expect(file.getClusterIdAt(-2500)).to.be.equal(0)
			done()
		})
		it('should return the id of the cluster that contain time', done => {
			expect(file.getClusterIdAt(12)).to.be.equal(1)
			done()
		})
		it('should compute the time from the end if time is negative', done => {
			expect(file.getClusterIdAt(-2)).to.be.equal(file.manifest.cues.length - 1)
			done()
		})
	})
})

