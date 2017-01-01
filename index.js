var assign = Object.assign || require('es6-object-assign').assign;
var memoize = require('memoizee');
var _ = require('lodash')

var processArgs = function (config, args) {
    var newArgs = {}
    Object.keys(config.args).map(function(k) {
        if (! args || ! args[k]) {
            console.error ('value', k, 'was not provided')
            return;
        }

        console.log ('processing', k)
        try {
            switch (config.args[k]) {
            case Provider.ArgType.NUMBER:
                newArgs[k] = Number(args[k])
                break;
            case Provider.ArgType.ARRAY:
                newArgs[k] = JSON.parse(args[k]);
                break;
            case Provider.ArgType.OBJECT:
                newArgs[k] = JSON.parse(args[k]);
                break;
            case Provider.ArgType.BOOLEAN:
                newArgs[k] = !!args[k];
                break;
            case Provider.ArgType.STRING:
            default:
                newArgs[k] = args[k]
                break;
            }
        } catch(e) {
            console.error("Error Parsing args", args, k, e)
        }
    })

    return assign({}, config.defaults, newArgs);
}

var Provider = function (args) {
    args = args || {};
    var config  = this.config || {}
    config.args = config.args || {}

    var memopts = args.memops || {
        maxAge: 10 * 60 * 1000,
        /* 10 minutes */
        preFetch: 0.5,
        /* recache every 5 minutes */
        primitive: true,
        promise: true
    };

    this.args = assign({}, this.args, processArgs(config, args))
    this.filters = assign({}, Provider.DefaultFilters, config.filters)

    this.memfetch = memoize(this.fetch.bind(this), memopts);
    this.fetch = this._fetch.bind(this);

    this.detail = memoize(this.detail.bind(this), memopts);
};

Provider.DefaultFilters = {
    genres: {
        all:         'All',
        action:      'Action',
        adventure:   'Adventure',
        animation:   'Animation',
        biography:   'Biography',
        comedy:      'Comedy',
        crime:       'Crime',
        documentary: 'Documentary',
        drama:       'Drama',
        family:      'Family',
        fantasy:     'Fantasy',
        filmNoir:    'Film-Noir',
        history:     'History',
        horror:      'Horror',
        music:       'Music',
        musical:     'Musical',
        mystery:     'Mystery',
        romance:     'Romance',
        sciFi:       'Sci-Fi',
        short:       'Short',
        sport:       'Sport',
        thriller:    'Thriller',
        war:         'War',
        western:     'Western'
    },
    sorters: {
        popularity:  'Popularity',
        trending:    'Trending',
        lastAdded:   'Last Added',
        year:        'Year',
        title:       'Title',
        rating:      'Rating'
    }
}

Provider.ArgType = {
    ARRAY:   'BUTTER_PROVIDER_ARG_TYPE_ARRAY',
    OBJECT:  'BUTTER_PROVIDER_ARG_TYPE_OBJECT',
    STRING:  'BUTTER_PROVIDER_ARG_TYPE_STRING',
    BOOLEAN: 'BUTTER_PROVIDER_ARG_TYPE_BOOLEAN',
    NUMBER:  'BUTTER_PROVIDER_ARG_TYPE_NUMBER'
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

function warnDefault(fn, support) {
    console.warn ('you are using the default ' + fn + ' implementation,')
    if (support)
        console.warn ('you will probably want to use your own to support:' + support + '.')
}

function randomArray(a) {
    return a[Math.ceil(Math.random(a.length))]
}

Provider.prototype.resolveStream = function (src, config, data) {
    warnDefault('resolveStream', 'multiple languages');
    return src;
}

Provider.prototype.random = function () {
    warnDefault('random', 'faster random');
    return this.fetch.apply(this)
        .then(function (data) {return randomArray(data.results)})
}

Provider.prototype.extractIds = function (items) {
    warnDefault('extractIds');
    return _.map(items.results, this.config.uniqueId)
}

Provider.prototype._fetch = function (filters) {
    filters = filters || {}
    filters.toString = this.toString;
    var promise = this.memfetch.bind(this)(filters),
    _this = this;
    promise.catch(function (error) {
        // Delete the cached result if we get an error so retry will work
        _this.memfetch.delete(filters);
    });
    return promise;
};

Provider.prototype.toString = function (arg) {
    return JSON.stringify(this);
};

Provider.prototype.parseArgs = function (name) {
    var tokenize = name.split('?');

    // XXX:reimplement querystring.parse to not escape
    var args = {}
    tokenize[1] && tokenize[1].split('&').map(function (v){
        var m = v.split('=')
        args[m[0]]= m[1]
    })

    return {
        name: tokenize[0],
        args: args
    }
}

module.exports = Provider
