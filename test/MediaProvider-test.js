const chai = require('chai')
const nock = require('nock')
const expect = chai.expect;

const MediaProvider = require('../lib/MediaProvider.js')


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
	it('should instanciate', done => {
		const url = "abcde.com/rofl?ok=1"
		const m = new MediaProvider({ url })
		expect(m).to.have.property('url')
		expect(m.url).to.be.equal(url)
		done()
	})
})