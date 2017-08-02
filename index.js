'use strict'

const memoize = require('memoizee')

const defaultArgs = {
  memops: {
    maxAge: 10 * 60 * 1000,
    /* 10 minutes */
    preFetch: 0.5,
    /* recache every 5 minutes */
    primitive: true,
    promise: true
  }
}

const defaultConfig = {
  args: {},
  filters: {}
}

class Provider {

  constructor(args = defaultArgs, config = defaultConfig) {
    this.args = args
    this.config = config

    const memopts = args.memops

    this.args = Object.assign(
      this.args,
      this._processArgs(this.config, this.args)
    )
    this.filters = Object.assign(
      {},
      Provider.DefaultFilters,
      this.config.filters
    )

    this.fetch = this._makeCached(this.fetch, memopts)
    this.detail = this._makeCached(this.detail, memopts)
  }

  _makeCached(method, memopts) {
    const memoizedMethod = memoize(method, memopts)

    return function() {
      // XXX: Should be replaced with spread operator if possible.
      return memoizedMethod.apply(this, arguments)
        .catch(error => {
          // Delete the cached result if we get an error so retry will work
          method.delete(this.filters)
          return Promise.reject(error)
        })
    }
  }

  _parseArgForType(type, args) {
    try {
      switch (type) {
        case Provider.ArgType.NUMBER:
          return Number(args)
        case Provider.ArgType.ARRAY:
          return JSON.parse(args)
        case Provider.ArgType.OBJECT:
          return JSON.parse(args)
        case Provider.ArgType.BOOLEAN:
          return !!args
        case Provider.ArgType.STRING:
        default:
          return args
      }
    } catch (e) {
      console.error('Error Parsing args', args, e)
    }
  }

  _parseArgs(config, uri) {
    const tokenize = uri.split('?')

    config = config || {args: {}}
    config.args = config.args || {}

    // XXX: Reimplement querystring.parse to not escape
    const args = {}

    // XXX: This really isn't readable code.
    tokenize[1] && tokenize[1].split('&').map(v => {
      const m = v.split('=')
      args[m[0]] = this._parseArgForType(config.args[m[0]], m[1])
    })

    return args
  }

  _processArgs(config, args) {
    if (typeof args === 'string') {
      // We got a URI
      args = this._parseArgs(config, args)
    }

    Object.keys(config.args).map(k => {
      if (!args || !args[k]) {
        console.error(`value ${k} was not provided`)
      }
    })

    return Object.assign({}, config.defaults, args)
  }

  _warnDefault(fn, support) {
    console.warn('you are using the default ' + fn + ' implementation,')

    if (support) {
      console.warn(
        `you will probably want to use your own to support: ${support}.`
      )
    }
  }

  _randomArray(a) {
    return a[Math.floor(Math.random() * a.length)]
  }

  resolveStream (src, config, data) {
    this._warnDefault('resolveStream', 'multiple languages')

    return src
  }

  random() {
    this._warnDefault('random', 'faster random')

    const uniqueId = this.config.uniqueId
    return this.fetch()
      .then(data => this._randomArray(data.results))
      .then(data => this.detail(data[uniqueId], data))
  }

  extractIds(items) {
    this._warnDefault('extractIds')

    return items.results.map(r => r[this.config.uniqueId])
  }

  detail(id, oldData) {
    this._warnDefault('detail', 'better performing fetch and detail calls')
    return Promise.resolve(oldData)
  }

  toString(arg) {
    return JSON.stringify(this)
  }

}

Provider.DefaultFilters = {
  genres: {
    all: 'All',
    action: 'Action',
    adventure: 'Adventure',
    animation: 'Animation',
    biography: 'Biography',
    comedy: 'Comedy',
    crime: 'Crime',
    documentary: 'Documentary',
    drama: 'Drama',
    family: 'Family',
    fantasy: 'Fantasy',
    filmNoir: 'Film-Noir',
    history: 'History',
    horror: 'Horror',
    music: 'Music',
    musical: 'Musical',
    mystery: 'Mystery',
    romance: 'Romance',
    sciFi: 'Sci-Fi',
    short: 'Short',
    sport: 'Sport',
    thriller: 'Thriller',
    war: 'War',
    western: 'Western'
  },
  sorters: {
    popularity: 'Popularity',
    trending: 'Trending',
    lastAdded: 'Last Added',
    year: 'Year',
    title: 'Title',
    rating: 'Rating'
  }
}

Provider.ArgType = {
  ARRAY: 'BUTTER_PROVIDER_ARG_TYPE_ARRAY',
  OBJECT: 'BUTTER_PROVIDER_ARG_TYPE_OBJECT',
  STRING: 'BUTTER_PROVIDER_ARG_TYPE_STRING',
  BOOLEAN: 'BUTTER_PROVIDER_ARG_TYPE_BOOLEAN',
  NUMBER: 'BUTTER_PROVIDER_ARG_TYPE_NUMBER'
}

Provider.ItemType = {
  MOVIE: 'movie',
  TVSHOW: 'tvshow'
}

Provider.OrderType = {
  ASC: 'asc',
  DESC: 'desc',
  NULL: null
}

Provider.SorterType = {
  NAME: 'name',
  RATING: 'rating',
  POPULARITY: 'popularity',
  NULL: null
}

Provider.QualityType = {
  DEFAULT: '0',
  LOW: '480p',
  MEDIUM: '720p',
  HIGH: '1080p'
}

module.exports = Provider
