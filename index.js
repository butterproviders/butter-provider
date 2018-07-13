'use strict'

const memoize = require('memoizee')
const debug = require('debug')('butter-provider')
const crypto = require('crypto')
const pkg = require(__dirname + '/package.json')

const defaultMemopts = {
  maxAge: 10 * 60 * 1000,
  /* 10 minutes */
  preFetch: 0.5,
  /* recache every 5 minutes */
  primitive: true,
  promise: 'then'
}

const defaultArgs = {
  memopts: defaultMemopts
}

const defaultConfig = {
  argTypes: {},
  filters: {}
}

function sha256 (text) {
  const hash = crypto.createHash('sha256')

  hash.update(text)
  return hash.digest('hex')
}

function parseArgs (uri, argTypes = {}) {
  // XXX: Reimplement querystring.parse to not escape
  const [name, args] = uri.split('?')
  const parsed = { name }

  if (args) {
    args.split('&').map(v => {
      const [ key, value ] = v.split('=')
      const type = argTypes[key] || Provider.ArgType.UNKNOWN

      parsed[key] = parseArgForType(type, value)
    })
  }

  return parsed
}

function parseArgForType (type, arg) {
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

function processArgs (argString, config) {
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
  constructor (args = defaultArgs, config = defaultConfig) {
    config.filters = Object.assign(
      {},
      Provider.DefaultFilters,
      config.filters
    )

    this.version = pkg.version
    this.args = Object.assign({}, defaultArgs, args, processArgs(args, config))
    const sha = sha256(JSON.stringify(this.args))

    this.config = Object.assign({}, {name: this.args.name}, config)
    this.id = `${config.name}_${sha}`

    const { memopts } = this.args
    this.fetch = this._makeCached(
      this.fetch.bind(this),
      Object.assign({
        length: 1,
        resolvers: [Object],
        normalizer: function (args) {
          return JSON.stringify(args[0])
        }
      }, memopts))

    this.detail = this._makeCached(
      this.detail.bind(this),
      Object.assign({
        length: 2,
        resolvers: [String, Object]
      }, memopts))
      
      if (this.random) this.random = this.random.bind(this)
      if (this.update) this.update = this.update.bind(this)
  }

  _makeCached (method, memopts) {
    debug('make cached', memopts)
    const memoizedMethod = memoize(method, memopts)

    return (...args) => {
      return memoizedMethod(...args)
        .catch(err => {
          // Delete the cached result if we get an error so retry will work
          memoizedMethod.delete(...args)
          return Promise.reject(err)
        })
    }
  }

  _warnDefault (fn, support) {
    let msg = `You are using the default ${fn} implementation`

    if (support) {
      msg += `, you will probably want to use your own to support: ${support}.`
    }

    console.warn(msg)
  }

  resolveStream (src) {
    this._warnDefault('resolveStream', 'multiple languages')

    return src
  }

  random () {
    this._warnDefault('random', 'faster random')

    return this.fetch({})
      .then(({ results }) => {
        const random = Math.floor(Math.random() * results.length)
        return results[random]
      })
      .then(data => this.detail(data.id, data))
  }

  extractIds (items = {results: []}) {
    this._warnDefault('extractIds')
    return items.results.map(r => r.id)
  }

  detail (id, oldData) {
    this._warnDefault(
      `detail: ${id}`, 'better performing fetch and detail calls'
    )

    return Promise.resolve(oldData)
  }

  fetch (filters) {
    this._warnDefault(
      `fetch: ${JSON.stringify(filters)}`, 'fetching of the data'
    )

    const err = new Error('Implement your own version of the \'fetch\' method')
    return Promise.reject(err)
  }

  toString () {
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
  TVSHOW: 'tvshow',
  TVSHOW2: 'tvshow2' /* newer TVSHOW API  */
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
