var memoize = require('memoizee');
var _ = require('lodash')

var Provider = function () {
    var memopts = {
        maxAge: 10 * 60 * 1000,
        /* 10 minutes */
        preFetch: 0.5,
        /* recache every 5 minutes */
        primitive: true
    };

    this.memfetch = memoize(this.fetch.bind(this), memopts);
    this.fetch = this._fetch.bind(this);

    this.detail = memoize(this.detail.bind(this), _.extend(memopts, {
        async: true
    }));
};

Provider.prototype._fetch = function (filters) {
    filters.toString = this.toString;
    var promise = this.memfetch(filters),
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

module.exports = Provider
