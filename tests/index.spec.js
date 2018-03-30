'use strict'

/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const Provider = require('../')

const defaultConfig = {
  argTypes: {
    key1: Provider.ArgType.ARRAY,
    key2: Provider.ArgType.STRING
  },
  filters: {},
  uniqueId: 'id'
}

describe('Provider Object', function () {
  it('should have static DefaultFilters', () => {
    const { DefaultFilters } = Provider
    expect(DefaultFilters).to.be.an('object')
    expect(DefaultFilters.genres).to.be.an('object')
    expect(DefaultFilters.sorters).to.be.an('object')
  })

  it('should have static ArgType', () => {
    expect(Provider.ArgType).to.be.an('object')
  })

  it('should have static ItemType', () => {
    expect(Provider.ItemType).to.be.an('object')
  })

  it('should have static OrderType', () => {
    expect(Provider.OrderType).to.be.an('object')
  })

  it('should have static SorterType', () => {
    expect(Provider.SorterType).to.be.an('object')
  })

  it('should have static QualityType', () => {
    expect(Provider.QualityType).to.be.an('object')
  })
})

describe('Provider.parseArgsForType', () => {
  before(() => {
    // Reasign the default console.warn function so the output of the test
    // results do not get cluttered.
    console.warn = () => {}
    console.error = () => {}
  })

  it('should parse an argument as a number', () => {
    const string = '1'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.NUMBER, string)
    expect(parsed).to.be.a('number')
  })

  it('should parse an argumant as an array', () => {
    const string = '["this is an array"]'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.ARRAY, string)
    expect(parsed).to.be.an('array')
  })

  it('should parse an argumant as an object', () => {
    const string = '{"key": "value"}'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.OBJECT, string)
    expect(parsed).to.be.an('object')
  })

  it('should parse an argumant as a boolean', () => {
    const string = 'true'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.BOOLEAN, string)
    expect(parsed).to.be.a('boolean')
  })

  it('should parse an argumant as a string', () => {
    const string = 'string'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.STRING, string)
    expect(parsed).to.be.a('string')
  })

  it('should detect that a string is not an object', () => {
    const string = 'this is not a valid stringified object'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.OBJECT, string)
    expect(parsed).to.be.undefined
  })

  it('should parse an object back to life', () => {
    const string = '{"key": {"subkey": 3}}'
    expect(string).to.be.a('string')

    const parsed = Provider.parseArgForType(Provider.ArgType.OBJECT, string)
    expect(parsed.key.subkey).to.be.a('number')
  })
})

describe('Provider.parseArgs', () => {
  let argTypes = defaultConfig.argTypes
  const argString = 'ProviderName?key1=["value1"]&key2=value2'

  it('should parse a string as arguments', () => {
    const parsed = Provider.parseArgs(argString, argTypes)

    expect(parsed).to.be.an('object')
    expect(parsed.key1).to.be.an('array')
    expect(parsed.key1[0]).to.be.a('string')
    expect(parsed.key2).to.be.a('string')
  })

  it('should not accept an object as arguments', () => {
    const args = {
      key1: ['value1']
    }
    expect(Provider.parseArgs.bind(this, args, argTypes)).to.throw()
  })

  it('should accept a uri with no args', () => {
    const shortUri = 'ProviderName?'
    const shortParsed = Provider.parseArgs(shortUri)
    expect(shortParsed).to.be.an('object')
    expect(shortParsed).to.deep.equal({})
  })
})

describe('Provider Arguments', () => {
  it('should process a string as arguments', () => {
    let provider = new Provider('ProviderName?key1=["value1"]&key2=value2', defaultConfig)

    expect(provider.args).to.be.an('object')
    expect(provider.args.key1).to.be.an('array')
    expect(provider.args.key2).to.be.a('string')
  })

  it('should process an object as arguments', () => {
    let provider = new Provider({
      key1: ['value1'],
      key2: 'value2'
    }, defaultConfig)

    expect(provider.args).to.be.an('object')
    expect(provider.args.key1).to.be.an('array')
    expect(provider.args.key2).to.be.a('string')
  })

  it('should accept an empty config', () => {
    let provider = new Provider('emptyArgTypes?key1=["value1"]&key2=value2', {})

    expect(provider.args).to.be.an('object')
    expect(provider.args.key1).to.be.an('array')
    expect(provider.args.key2).to.be.a('string')
  })

  it('should accept an empty args', () => {
    let provider = new Provider({}, {})

    expect(provider.args).to.be.an('object')
  })

  it('should accept no config', () => {
    let provider = new Provider('emptyArgTypes?key1=["value1"]&key2=value2')

    expect(provider.args).to.be.an('object')
    expect(provider.args.key1).to.be.an('array')
    expect(provider.args.key2).to.be.a('string')
  })

  it('should accept no config, no args', () => {
    let provider = new Provider()

    expect(provider.args).to.be.an('object')
  })
})

describe('Provider Instance', () => {
  let ids, items, tempFetch

  let provider = new Provider('ProviderName?key1=["value1"]&key2=value2', defaultConfig)

  before(() => {
    // Reasign the default console.warn function so the output of the test
    // results do not get cluttered.
    console.warn = () => {}
    console.error = () => {}

    items = {
      results: []
    }
    ids = [1, 2, 3, 4, 5]
    ids.map(n => items.results.push({
      [provider.config.uniqueId]: n
    }))
  })

  describe('resolveStream', () => {
    it('should parse a string to an object', () => {
      const uri = 'ProviderName?key1=["value1"]&key2=value2'
      const parsed = provider._parseArgs(uri)
      expect(parsed).to.be.an('object')

      const shortUri = 'ProviderName?'
      const shortParsed = provider._parseArgs(shortUri)
      expect(shortParsed).to.be.an('object')
      expect(shortParsed).to.deep.equal({})
    })

    it('should not change the given source', () => {
      const src = provider.resolveStream({
        key: 'value'
      })
      const resolved = provider.resolveStream(src)

      expect(resolved).to.deep.equal(src)
    })
  })

  it('should fetch a random result', done => {
    tempFetch = provider.fetch
    provider.fetch = () => Promise.resolve(items)

    provider.random().then(res => {
      expect(items.results).to.include(res)
      done()
    }).catch(done)
  })

  it('should extract the unique ids', () => {
    const extracted = provider.extractIds(items)
    expect(extracted).to.be.an('array')
    expect(extracted.length).to.be.at.least(1)

    const random = Math.floor(Math.random() * extracted.length)
    expect(ids).to.include(extracted[random])
  })

  it('should return the old data in a promise', done => {
    const oldData = {
      key: 'value'
    }

    provider.detail('id', oldData)
      .then(res => {
        expect(res).to.be.an('object')
        expect(res).to.deep.equal(oldData)

        done()
      }).catch(done)
  })

  it('should fail at executing the default fetch method', done => {
    provider.fetch = tempFetch
    provider.fetch({})
      .then(done)
      .catch(err => {
        expect(err).to.be.an('Error')

        const msg = 'Implement your own version of the \'fetch\' method'
        expect(err.message).to.include(msg)

        done()
      })
  })

  it('should stringify the provider instance', () => {
    expect(provider.toString()).to.be.a('string')
  })
})
