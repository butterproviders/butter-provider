'use strict'

const memoize = require('memoizee')
const debug = require('debug')('butter-provider')
const crypto = require('crypto')

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
  filters: {},
  uniqueId: 'id'
}

function sha256(text) {
  const hash = crypto.createHash('sha256')

  hash.update(text)
  return hash.digest('hex')
}

function parseArgs(uri, argTypes = {}) {
  // XXX: Reimplement querystring.parse to not escape
  const [name, args] = uri.split('?')
  const parsed = {name: name}

  if (args) {
    args.split('&').map(v => {
      const [ key, value ] = v.split('=')
      const type = argTypes[key] || Provider.ArgType.UNKNOWN

      parsed[key] = parseArgForType(type, value)
    })
  }

  return parsed
}

function parseArgForType(type, arg) {
  debug(`parsing ${arg} as ${type}`)
  try {
    switch (type) {
      case Provider.ArgType.NUMBER:
        return Number(arg)
      case Provider.ArgType.ARRAY:
      case Provider.ArgType.OBJECT:
        return JSON.parse(arg)
      case Provider.ArgType.BOOLEAN:
        return !!arg
      case Provider.ArgType.UNKNOWN:
        debug('parsing unknown arg')
        try {
          return JSON.parse(arg)
        } catch (e) {
          debug(arg, 'is not an object')
        }

        return arg
      case Provider.ArgType.STRING:
      default:
        return arg
    }
  } catch (err) {
    console.error(`Error parsing argument: ${arg}, error: ${err}`)
  }
}

function processArgs(argString, config) {
  debug(`processing arg: ${JSON.stringify(argString)}`)
  const { argTypes, defaults } = config

  const parsed = typeof argString === 'string'
    ? parseArgs(argString, argTypes)
    : undefined

  debug(`parsed: ${JSON.stringify(parsed)}`)

  const args = Object.assign({}, defaults, parsed)

  argTypes && Object.keys(argTypes).map(k => {
    if (!args || !args[k]) {
      console.error(`Value ${k} was not provided`)
    }
  })

  return args
}

class Provider {

  constructor(args = defaultArgs, config = defaultConfig) {
    config.filters = Object.assign(
      {},
      Provider.DefaultFilters,
      config.filters
    )

    this.args = Object.assign({}, args, processArgs(args, config))
    const sha = sha256(JSON.stringify(this.args))

    this.config = Object.assign({}, {name: this.args.name}, config)
    this.id = `${config.name}_${sha}`

    const { memopts } = this.args
    this.fetch = this._makeCached(this.fetch, memopts)
    this.detail = this._makeCached(this.detail, memopts)
  }

  _makeCached(method, memopts) {
    const self = this
    const memoizedMethod = memoize(method, memopts)

    return function () {
      // XXX: Should be replaced with spread operator if possible.
      return memoizedMethod.apply(this, arguments)
        .catch(err => {
          // Delete the cached result if we get an error so retry will work
          memoizedMethod.delete(self.filters)
          return Promise.reject(err)
        })
    }
  }

  _parseArgs(argString) {
    return Provider.parseArgs(argString, this.config.argTypes)
  }

  _processArgs(argString) {
    processArgs(argString, this.config)
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
  NUMBER: 'BUTTER_PROVIDER_ARG_TYPE_NUMBER',
  UNKNOWN: 'BUTTER_PROVIDER_ARG_TYPE_UNKNOWN'
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

Provider.parseArgs = parseArgs
Provider.parseArgForType = parseArgForType

module.exports = Provider
