'use strict'

const memoize = require('memoizee')
const debug = require('debug')('butter-provider')

const defaultMemopts = {
  maxAge: 10 * 60 * 1000,
  /* 10 minutes */
  preFetch: 0.5,
  /* recache every 5 minutes */
  primitive: true,
  promise: true
}

const defaultArgs = {
  memopts: defaultMemopts
}

const defaultConfig = {
  argTypes: {},
  filters: {}
}

class Provider {

  constructor(args = defaultArgs, config = defaultConfig) {
    config.filters = Object.assign(
      {},
      Provider.DefaultFilters,
      config.filters
    )

    this.config = config
    this.args = Object.assign({}, args, this._processArgs(args))

    const { memopts } = this.args
    this.fetch = this._makeCached(this.fetch, memopts)
    this.detail = this._makeCached(this.detail, memopts)
  }

  _makeCached(method, memopts) {
    const self = this
    const memoizedMethod = memoize(method, memopts)

    return function() {
      // XXX: Should be replaced with spread operator if possible.
      return memoizedMethod.apply(this, arguments)
        .catch(err => {
          // Delete the cached result if we get an error so retry will work
          memoizedMethod.delete(self.filters)
          return err
        })
    }
  }

  _processArgs(argString) {
    debug (`processing arg: ${argString}`)
    const parsed = typeof argString === 'string'
      ? this._parseArgs(argString)
      : undefined

    debug (`parsed: ${JSON.stringify(parsed)}`)

    const { argTypes, defaults } = this.config
    Object.keys(argTypes).map(k => {
      if (!argTypes || !argTypes[k]) {
        console.error(`Value ${k} was not provided`)
      }
    })

    return Object.assign({}, defaults, parsed)
  }

  _parseArgs(uri) {
    // XXX: Reimplement querystring.parse to not escape
    const parsed = {}
    const [ , args ] = uri.split('?')

    if (args) {
      args.split('&').map(v => {
        const [ key, value ] = v.split('=')

        parsed[key] = this._parseArgForType(this.config.argTypes[key], value)
      })
    }

    return parsed
  }

  _parseArgForType(type, arg) {
    debug (`parsing ${arg} as ${type}`)
    try {
      switch (type) {
        case Provider.ArgType.NUMBER:
          return Number(arg)
        case Provider.ArgType.ARRAY:
        case Provider.ArgType.OBJECT:
          return JSON.parse(arg)
        case Provider.ArgType.BOOLEAN:
          return !!arg
        case Provider.ArgType.STRING:
        default:
          return arg
      }
    } catch (err) {
      console.error(`Error parsing argument: ${arg}, error: ${err}`)
    }
  }

  _warnDefault(fn, support) {
    let msg = `You are using the default ${fn} implementation`

    if (support) {
      msg += `, you will probably want to use your own to support: ${support}.`
    }

    console.warn(msg)
  }

  resolveStream(src) {
    this._warnDefault('resolveStream', 'multiple languages')

    return src
  }

  random() {
    this._warnDefault('random', 'faster random')

    const uniqueId = this.config.uniqueId
    return this.fetch({})
      .then(({ results }) => {
        const random = Math.floor(Math.random() * results.length)
        return results[random]
      })
      .then(data => this.detail(data[uniqueId], data))
  }

  extractIds(items) {
    this._warnDefault('extractIds')

    return items.results.map(r => r[this.config.uniqueId])
  }

  detail(id, oldData) {
    this._warnDefault(
      `detail: ${id}`, 'better performing fetch and detail calls'
    )

    return Promise.resolve(oldData)
  }

  fetch(filters) {
    this._warnDefault(
      `fetch: ${JSON.stringify(filters)}`, 'fetching of the data'
    )

    const err = new Error('Implement your own version of the \'fetch\' method')
    return Promise.reject(err)
  }

  toString() {
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
  HIGH: '1080p',
  NULL: null
}

module.exports = Provider
