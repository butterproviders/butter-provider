'use strict'

/* eslint-disable no-unused-expressions */
const debug = require('debug')('butter-provider:tests')
const path = require('path')
const Provider = require('../')
const { expect } = require('chai')

const pkg = require(path.join(process.cwd(), 'package.json'))
let config = {
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

function load () {
  return require(process.cwd())
}

function isEmpty (obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

function instanciate (loadFunction) {
  if (isEmpty(loadFunction)) {
    loadFunction = load
  }

  const P = loadFunction()
  return new P(config.args)
}

function isInValues (element, set) {
  return Object.keys(set).reduce((a, c) => (a || (element === set[c])))
}

function getRandomKey (array) {
  return Math.floor(Math.random() * (array.length))
}

function getRandom (array) {
  return array[getRandomKey(array)]
}

function runAllTests (loadFunction) {
  if (isEmpty(loadFunction)) {
    loadFunction = load
  }

  function testDetail (details) {
    expect(details).to.exist

    const type = details.type
    expect(isInValues(type, Provider.ItemType)).to.exist

    expect(details.id).to.exist
    expect(details.title).to.exist
    expect(details.year).to.exist
    expect(details.genres).to.exist
    expect(details.genres.length).to.be.at.least(0)
    expect(details.rating).to.exist
    expect(details.backdrop).to.exist
    expect(details.poster).to.exist
    expect(details.subtitle).to.exist

    if (type !== Provider.ItemType.TVSHOW2) {
      expect(details.synopsis).to.exist
      expect(details.synopsis).to.be.a('string')
      expect(details.synopsis.length).to.be.at.least(16)
      expect(details.runtime).to.exist
    }

    if (type === Provider.ItemType.MOVIE) {
      expect(details.trailer || details.trailer === false, 'we have a trailer')
      expect(details.sources, 'we have a sources field')

      const quality = getRandom(Object.keys(details.sources))
      expect(isInValues(quality, Provider.QualityType)).to.exist
      expect(details.sources[quality], 'we have a quality object')
      expect(details.sources[quality].url, 'we have an url to stream')
      expect(details.sources[quality].size, 'we have the size')
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
      expect(episode.sources).to.exist

      const quality = getRandom(Object.keys(details.sources))
      expect(isInValues(quality, Provider.QualityType)).to.exist
      expect(episode.sources[quality]).to.exist
      expect(episode.sources[quality].url).to.exist
    } else if (type === Provider.ItemType.TVSHOW2) {
      expect(details.status).to.exist
      expect(details.num_seasons).to.exist
      expect(details.seasons).to.exist
      expect(details.seasons.length).to.be.at.least(0)

      const season = getRandom(details.seasons)
      expect(season.first_aired).to.exist
      expect(season.overview).to.exist
      expect(season.order).to.exist
      expect(season.id).to.exist

      expect(season.episodes).to.exist
      expect(season.episodes.length).to.be.at.least(0)

      const episode = getRandom(season.episodes)

      expect(episode.first_aired).to.exist
      expect(episode.overview).to.exist
      expect(isFinite(episode.order)).to.exist
      expect(episode.season).to.exist
      expect(episode.id).to.exist
      expect(episode.sources).to.exist

      const quality = getRandom(Object.keys(episode.sources))
      expect(isInValues(quality, Provider.QualityType)).to.exist
      expect(episode.sources[quality]).to.exist
      expect(episode.sources[quality].url).to.exist
    }
  }

  describe(pkg.name, function () {
    let instance

    this.timeout(config.timeout)
    before(() => {
      instance = instanciate(loadFunction)
    })

    it('should tests the implemented config object', () => {
      const { config } = instance
      expect(config.name).to.exist
      expect(config.tabName).to.exist
      expect(instance.args).to.exist
    })

    it('should do a simple fetch', done => {
      instance.fetch()
        .then(res => {
          debug('fetch', res)

          expect(res).to.exist
          expect(res.hasMore).to.be.a('boolean')
          expect(res.results).to.be.an('array')
          expect(res.results.length).to.be.at.least(0)

          done()
        })
        .catch(done)
    })

    it('should support limit argument on fetch (or return 50)', done => {
      instance.fetch({ limit: 2 })
        .then(res => {
          debug('fetch({limit:2})', res)

          expect(res).to.exist
          expect(res.results).to.be.an('array')
          expect(res.results.length).to.be.oneOf([2, 50])
          done()
        })
    })

    it('should be able to fetch multiple pages', done => {
      let fetchRes

      instance.fetch({ limit: 2, page: 0 })
        .then(res => {
          debug('fetch({limit:2, page:0}): ', res)
          fetchRes = res

          expect(res).to.exist
          expect(res.hasMore).to.be.a('boolean')
          expect(res.results).to.be.an('array')
          expect(res.results.length).to.be.at.least(0)
        })
        .then(() => instance.fetch({ limit: 2, page: 1 }))
        .then(res => {
          debug('fetch({page:1}): ', res)

          expect(res).to.exist
          expect(res.hasMore).to.be.a('boolean')
          expect(res.results).to.be.an('array')
          expect(res.results.length).to.be.at.least(0)

          expect(res.results[0]).to.not.equal(fetchRes.results[0])
          done()
        })
        .catch(done)
    })

    it('should test the implemented extractIds method', (done) => {
      instance.fetch()
        .then(res => {
          const ids = instance.extractIds(res)

          expect(ids).to.be.an('array')
          expect(ids.length).to.be.at.least(0)

          done()
        })
    })

    it('should test the implemented details method', done => {
      instance.fetch()
        .then(res => {
          const ids = instance.extractIds(res)
          const key = getRandomKey(ids)

          return instance.detail(ids[key], res.results[key])
        })
        .then(res => {
          debug('details', res)
          testDetail(res)

          done()
        }).catch(done)
    })

    it('should test the implemented random method', done => {
      instance.random()
        .then(res => {
          debug('random', res)
          testDetail(res)

          done()
        }).catch(done)
    })
  })
}

module.exports = runAllTests
