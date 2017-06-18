const chai = require('chai');
const expect = chai.expect;

const Jamy = require('../');

describe('Jamy', () => {
	it('should instanciate', done => {
		const options = { format: "s16le", channels: 1, frequency: 4800, bitDepth: 16 };
		const j = new Jamy(options);
		expect(j).to.have.property('playbackOptions')
		expect(j.playbackOptions).to.deep.equal(options)
		done()
	})
})

