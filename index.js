var memoize = require('memoizee');
var _ = require('lodash')

var Provider = function (args) {
    args = args || {};
    var memopts = args.memops || {
        maxAge: 10 * 60 * 1000,
        /* 10 minutes */
        preFetch: 0.5,
        /* recache every 5 minutes */
        primitive: true
    };

    var config  = this.config || {}
    config.args = config.args || {}
    args = args || []
    this.args = {}

    Object.keys(config.args).map(k => {
        switch (config.args[k]) {
        case Provider.Types.NUMBER:
            this.args[k] = Number(args[k])
            break;
        case Provider.Types.ARRAY:
            this.args[k] = args[k].split(',');
            break;
        case Provider.Types.OBJECT:
            this.args[k] = JSON.Parse(args[k]);
            break;
        case Provider.Types.BOOLEAN:
            this.args[k] = !!args[k];
            break;
        case Provider.Types.STRING:
        default:
            this.args[k] = args[k]
            break;

        }
    })

    this.memfetch = memoize(this.fetch.bind(this), memopts);
    this.fetch = this._fetch.bind(this);

    this.detail = memoize(this.detail.bind(this), _.extend(memopts, {
        async: true
    }));
};

Provider.Types = {
    ARRAY:   'BUTTER_PROVIDER_TYPE_ARRAY',
    OBJECT:  'BUTTER_PROVIDER_TYPE_OBJECT',
    STRING:  'BUTTER_PROVIDER_TYPE_STRING',
    BOOLEAN: 'BUTTER_PROVIDER_TYPE_BOOLEAN',
    NUMBER:  'BUTTER_PROVIDER_TYPE_NUMBER'
}

Provider.prototype.resolveStream = function (src, filters, data) {
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
