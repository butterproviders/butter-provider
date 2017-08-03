'use strict'

/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const Provider = require('../')

describe('Provider', () => {
  let ids, items, provider, tempFetch
  before(() => {
    // Reasign the default console.warn function so the output of the test
    // results do not get cluttered.
    console.warn = () => {}
    console.error = () => {}

    provider = new Provider()

    items = {
      results: []
    }
    ids = [1, 2, 3, 4, 5]
    ids.map(n => items.results.push({
      [provider.config.uniqueId]: n
    }))
  })

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

  it('should process a string as arguments', () => {
    provider = new Provider('ProviderName?key1=["value1"]&key2=value2', {
      argTypes: {
        key1: Provider.ArgType.ARRAY,
        key2: Provider.ArgType.STRING
      },
      filters: {},
      uniqueId: 'id'
    })

    const args = 'ProviderName?key1=["value1"]'
    const processed = provider._processArgs(args)
    expect(processed).to.be.an('object')
  })

  it('should process an object as arguments', () => {
    const args = {
      key1: ['value1']
    }
    const processed = provider._processArgs(args)
    expect(processed).to.be.an('object')
  })

  it('should parse a string to an object', () => {
    const uri = 'ProviderName?key1=["value1"]&key2=value2'
    const parsed = provider._parseArgs(uri)
    expect(parsed).to.be.an('object')

    const shortUri = 'ProviderName?'
    const shortParsed = provider._parseArgs(shortUri)
    expect(shortParsed).to.be.an('object')
    expect(shortParsed).to.deep.equal({})
  })

  it('should parse an argument as a number', () => {
    const string = '1'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.NUMBER, string)
    expect(parsed).to.be.a('number')
  })

  it('should parse an argumant as an array', () => {
    const string = '["this is an array"]'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.ARRAY, string)
    expect(parsed).to.be.an('array')
  })

  it('should parse an argumant as an object', () => {
    const string = '{"key": "value"}'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.OBJECT, string)
    expect(parsed).to.be.an('object')
  })

  it('should parse an argumant as a boolean', () => {
    const string = 'true'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.BOOLEAN, string)
    expect(parsed).to.be.a('boolean')
  })

  it('should parse an argumant as a boolean', () => {
    const string = 'string'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.STRING, string)
    expect(parsed).to.be.a('string')
  })

  it('should parse an argumant as a boolean', () => {
    const string = 'this is not a valid stringified object'
    expect(string).to.be.a('string')

    const parsed = provider._parseArgForType(Provider.ArgType.OBJECT, string)
    expect(parsed).to.be.undefined
  })

  it('should not change the given source', () => {
    const src = provider.resolveStream({
      key: 'value'
    })
    const resolved = provider.resolveStream(src)

    expect(resolved).to.deep.equal(src)
  })

  it('should fetch a random result', done => {
    tempFetch = provider.fetch
    provider.fetch = () => Promise.resolve(items)

    provider.random()
      .then(res => {
        expect(items.results).to.include(res)
        done()
      })
      .catch(done)
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
      })
      .catch(done)
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