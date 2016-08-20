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
        switch (config.args[k]) {
        case Provider.ArgType.NUMBER:
            newArgs[k] = Number(args[k])
            break;
        case Provider.ArgType.ARRAY:
            newArgs[k] = args[k].split(',');
            break;
        case Provider.ArgType.OBJECT:
            newArgs[k] = JSON.Parse(args[k]);
            break;
        case Provider.ArgType.BOOLEAN:
            newArgs[k] = !!args[k];
            break;
        case Provider.ArgType.STRING:
        default:
            newArgs[k] = args[k]
            break;
        }
    })

    return newArgs
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
        primitive: true
    };

    this.args = assign({}, this.args, processArgs(config, args))

    this.memfetch = memoize(this.fetch.bind(this), memopts);
    this.fetch = this._fetch.bind(this);

    this.detail = memoize(this.detail.bind(this), _.extend(memopts, {
        async: true
    }));
};

Provider.ArgType = {
    ARRAY:   'BUTTER_PROVIDER_ARG_TYPE_ARRAY',
    OBJECT:  'BUTTER_PROVIDER_ARG_TYPE_OBJECT',
    STRING:  'BUTTER_PROVIDER_ARG_TYPE_STRING',
    BOOLEAN: 'BUTTER_PROVIDER_ARG_TYPE_BOOLEAN',
    NUMBER:  'BUTTER_PROVIDER_ARG_TYPE_NUMBER'
}

Provider.TabType = {
    MOVIE:   'movie',
    TVSHOW:  'tvshow',
    ANIME:   'anime'
}

Provider.prototype.resolveStream = function (src, config, data) {
    console.warn ('you are using the default resolveStream implementation,')
    console.warn ('you will probably want to use your own to support different langages.')
    return src;
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
