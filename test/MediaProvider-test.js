const chai = require('chai')
const nock = require('nock')
const rewire = require('rewire');
const expect = chai.expect;

const MediaProvider = rewire('../lib/MediaProvider.js')


const mochaAsync = (fn) => {
	return async (done) => {
		try {
			await fn();
			done();
		} catch (err) {
			done(err);
		}
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
	it("should throw an error if specified range is invalid", done => {
		const m = new MediaProvider()
		m.getRange(4, 2)
			.then(() => done(new Error("getRange should have thrown an error")))
			.catch(e => {
				if (e.message !== "Invalid range") done(new Error("Wrong error " + e))
				else done()
			})
	})
})