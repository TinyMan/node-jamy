const chai = require('chai')
const rewire = require('rewire');
const expect = chai.expect;
const mockery = require('mockery')
const fs = require('fs')

const MediaProvider = rewire('../lib/MediaProvider.js')


const mochaAsync = (fn) => {
	return done => {
		fn().then(() => done()).catch(done)
	};
};

describe('MediaProvider', () => {
	const parseRange = MediaProvider.__get__('parseRange');
	it('should instanciate', done => {
		const url = "abcde.com/rofl?ok=1"
		const m = new MediaProvider({ url })
		expect(m).to.have.property('url')
		expect(m.url).to.be.equal(url)
		done()
	})
	it("should successfully parse a range with the format \\d+-\\d+", done => {
		const m = new MediaProvider({
			init: "0-200",
			index: "201-500"
		})
		expect(m.ranges.init).to.be.deep.equal({ start: 0, end: 200 })
		expect(m.ranges.index).to.be.deep.equal({ start: 201, end: 500 })
		done()
	})
	it("should throw an error if specified range is invalid", mochaAsync(async () => {
		const m = new MediaProvider()
		try {
			await m.getRange(4, 2)
			throw new Error("getRange should have thrown an error")
		} catch (e) {
			if (e.message !== "Invalid range") throw new Error("Wrong error " + e)
		}
	}))
	describe("mocked queries", () => {
		const file = fs.readFileSync(__dirname + "/samples/DTMF2000ms-vorbis.webm")
		before(() => {
			mockery.enable({
				warnOnReplace: false,
				warnOnUnregistered: false,
				useCleanCache: true
			});
			mockery.registerMock('request-promise-native', function (e) {
				const range = parseRange(e.headers.Range.split('=')[1])
				const bytes = file.slice(range.start, range.end)
				return Promise.resolve(bytes)
			})
		})
		after(() => {
			mockery.disable();
			mockery.deregisterAll();
		})
		it("should return the correct portions of the file", mochaAsync(async () => {
			const m = new (require('../lib/MediaProvider.js'))({
				url: "http://127.0.0.1/ok",
				init: "0-100",
				index: "101-200"
			})
			let bytes = await m.getInit()
			expect(bytes.length).to.be.equal(100)
			expect(bytes.compare(file, 0, 100)).to.be.equal(0)
			bytes = await m.getIndex()
			expect(bytes.length).to.be.equal(99)
			expect(bytes.compare(file, 101, 200)).to.be.equal(0)
		}))
	})
})