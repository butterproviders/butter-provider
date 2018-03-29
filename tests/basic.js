'use strict'

/* eslint-disable no-unused-expressions */
const debug = require('debug')('butter-provider:tests')
const path = require('path')
const Provider = require('../')
const { expect } = require('chai')

const pkg = require(path.join(process.cwd(), 'package.json'))

var config = {
  args: {},
  timeout: 1000
}

if (pkg.butter) {
  config = Object.assign({}, config, pkg.butter)

  if (pkg.butter.testArgs) {
    config.args = pkg.butter.testArgs
  }
}

debug('starting test with config: ', config)

function load() {
  return require(process.cwd())
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

function instanciate(loadFunction) {
  if (isEmpty(loadFunction)) {
    loadFunction = load
  }

  const P = loadFunction()
  return new P(config.args)
}

function isInValues(element, set) {
  return Object.keys(set).reduce((a, c) => (a || (element === set[c])))
}

function getRandomKey(array) {
  return Math.floor(Math.random() * (array.length))
}

function getRandom(array) {
  return array[getRandomKey(array)]
}

function runAllTests(loadFunction) {
  if (isEmpty(loadFunction)) {
    loadFunction = load
  }

  function testDetail(details, uniqueId) {
    expect(details).to.exist
    expect(details[uniqueId] || details.id).to.exist
    expect(details.title).to.exist
    expect(details.year).to.exist
    expect(details.genres).to.exist
    expect(details.genres.length).to.be.at.least(0)
    expect(details.rating).to.exist
    expect(details.backdrop).to.exist
    expect(details.poster).to.exist
    expect(details.subtitle).to.exist
    expect(details.synopsis).to.exist
    expect(details.synopsis).to.be.a('string')
    expect(details.synopsis.length).to.be.at.least(16)
    expect(details.runtime).to.exist

    const type = details.type
    expect(isInValues(type, Provider.ItemType)).to.exist

    if (type === Provider.ItemType.MOVIE) {
      expect(details.trailer || details.trailer === false, 'we have a trailer')
      expect(details.torrents, 'we have a torrents field')

      const quality = getRandom(Object.keys(details.torrents))
      expect(isInValues(quality, Provider.QualityType)).to.exist
      expect(details.torrents[quality], 'we have a quality object')
      expect(details.torrents[quality].url, 'we have an url to stream')
      expect(details.torrents[quality].size, 'we have the size')
    } else if (type === Provider.ItemType.TVSHOW) {
      expect(details.status).to.exist
      expect(details.num_seasons).to.exist
      expect(details.episodes).to.exist
      expect(details.episodes.length).to.be.at.least(0)

      const episode = getRandom(details.episodes)
      expect(episode.first_aired).to.exist
      expect(episode.overview).to.exist
      expect(isFinite(episode.episode)).to.exist
      expect(episode.season).to.exist
      expect(episode.tvdb_id).to.exist
      expect(episode.torrents).to.exist

      const quality = getRandom(Object.keys(details.torrents))
      expect(isInValues(quality, Provider.QualityType)).to.exist
      expect(episode.torrents[quality]).to.exist
      expect(episode.torrents[quality].url).to.exist
    }
  }

  describe(pkg.name, function () {
    let fetchRes, instance, key, uniqueIds
    this.timeout(config.timeout)
    before(() => {
      instance = instanciate(loadFunction)
    })

    it('should tests the implemented config object', () => {
      const { config } = instance
      expect(config.name).to.exist
      expect(config.uniqueId).to.exist
      expect(config.tabName).to.exist
      expect(instance.args).to.exist
    })

    it('should test the implemented fetch method', done => {
      instance.fetch()
        .then(res => {
          fetchRes = res
          debug(`fetch: ${res}`)

          expect(res).to.exist
          expect(res.hasMore).to.be.a('boolean')
          expect(res.results).to.be.an('array')
          expect(res.results.length).to.be.at.least(0)

          done()
        })
        .catch(done)
    })

    it('should test the implemented extractIds method', () => {
      uniqueIds = instance.extractIds(fetchRes)
      key = getRandomKey(uniqueIds)

      expect(uniqueIds).to.be.an('array')
      expect(uniqueIds.length).to.be.at.least(0)
    })

    it('should test the implemented details method', done => {
      instance.detail(uniqueIds[key], fetchRes.results[key])
        .then(res => {
          debug(`detail: ${res}`)
          testDetail(res, instance.config.uniqueId)

          done()
        })
        .catch(done)
    })

    it('should test the implemented random method', done => {
      instance.random()
        .then(res => {
          debug(`random: ${res}`)
          testDetail(res, instance.config.uniqueId)

          done()
        })
        .catch(done)
    })
  })
}

runAllTests.apply(this, arguments)

module.exports = runAllTests
