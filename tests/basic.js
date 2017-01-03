var path = require('path');
var tape = require('tape');
var Provider = require('butter-provider');
var debug = require('debug')('butter-provider:tests');

var pkg = require(path.join(process.cwd(), 'package.json'));

var config = {
    args: {},
    timeout: 1000
};

if (pkg.butter) {
    config = Object.assign({}, config, pkg.butter);
}

function load() {
    return require(process.cwd());
}

function instanciate() {
    var P = load();
    var testArgs = pkg.butter?pkg.butter.testArgs:null;

    return new P(testArgs);
}

function isInValues(element, set) {
    return Object.keys(set).reduce(function (a, c) {
        return a || (element === set[c]);
    });
}

function testDetail(t, d, uniqueId) {
    t.ok(d, 'we were able to get details');
    t.ok(d[uniqueId] || d.id, 'we have an unique id');
    t.ok(d.title, 'we have a title');
    t.ok(d.year, 'we have a year');
    t.ok(d.genres, 'we have a genres field');
    t.ok(d.genres.length > 0, 'we have at least 1 genre');
    t.ok(d.rating, 'we have a rating');
    t.ok(d.backdrop, 'we have a backdrop');
    t.ok(d.poster, 'we have a poster');
    t.ok(d.subtitle, 'we have a subtitle');
    t.ok(d.synopsis, 'we have a synopsis');
    t.ok(typeof (d.synopsis) === 'string', 'synopsis is a string');
    t.ok(d.synopsis.length > 16, 'synopsis is at least 16 bytes');
    t.ok(d.runtime, 'we have a runtime');

    var type = d.type;
    t.ok(isInValues(type, Provider.ItemType), 'we have a type field which is an item type');

    if (type === Provider.ItemType.MOVIE) {
        t.ok(d.trailer || d.trailer === false, 'we have a trailer');

        t.ok(d.torrents, 'we have a torrents field');
        var quality = Object.keys(d.torrents)[0];
        t.ok(isInValues(quality, Provider.QualityType),
            'we have a quality which is a quality type');
        t.ok(d.torrents[quality], 'we have a quality object');
        t.ok(d.torrents[quality].url, 'we have an url to stream');
        t.ok(d.torrents[quality].size, 'we have the size');
    } else if (type===Provider.ItemType.TVSHOW) {
        t.ok(d.status, 'we have a status');
        t.ok(d.num_seasons, 'we have a num_seasons field');
        t.ok(d.episodes, 'we have an episodes field');
        t.ok(d.episodes.length > 0, 'we have at least 1 episode');

        t.ok(d.episodes[0].watched===false || d.episodes[0].watched===true,
            'we have a watched field that is a boolean');
        t.ok(d.episodes[0].first_aired, 'we have a first aired field');
        t.ok(d.episodes[0].overview, 'we have an overview');
        t.ok(d.episodes[0].episode, 'we have an episode number');
        t.ok(d.episodes[0].season, 'we have a season number');
        t.ok(d.episodes[0].tvdb_id, 'we have a tvdb id');

        t.ok(d.episodes[0].torrents, 'we have a torrents field');
        var quality = Object.keys(d.episodes[0].torrents)[0];
        t.ok(isInValues(quality, Provider.QualityType),
            'we have a quality which is a quality type');
        t.ok(d.episodes[0].torrents[quality], 'we have a quality object');
        t.ok(d.episodes[0].torrents[quality].url, 'we have an url to stream');
    } else {
        t.notOk(type, 'is not a valid type');
    }
}

tape.onFinish(function() {
    process.exit(0);
});

tape('loads', function (t) {
    var P = load();

    t.ok(P, 'we were able to load');

    var I = instanciate();

    t.ok(I, 'we were able to instanciate');

    t.ok(I.config.name, 'we have a name');
    t.ok(I.config.uniqueId, 'we have a uniqueId');
    t.ok(I.config.tabName, 'we have a tabName');

    t.ok(I.args, 'we have an args object');

    t.end();
});

tape('fetch', function (t) {
    debug('fetch, timeout', config.timeout);
    t.timeoutAfter(config.timeout);

    var I = instanciate();

    I.fetch().then(function (r) {
        debug ('fetch', r);
        t.ok(r, 'we were able to fetch');
        t.ok(r.hasMore===true || r.hasMore===false, 'we have a hasMore field that is a boolean');
        t.ok(r.results, 'we have a results field');
        t.ok(r.results.length > 0, 'we have at least 1 result');

        var uniqueIds = I.extractIds(r);
        t.ok(uniqueIds, 'extractIds');
        I.detail(uniqueIds[0], r.results[0]).then(function (d) {
            debug ('detail', d);
            testDetail(t, d, I.config.uniqueId);
            t.end();
        }).catch(function (e) {
            t.notOk(e, 'failed detail');
        });
    }).catch(function (e) {
        t.notOk(e, 'failed fetch');
    });
});

tape('random', function (t) {
    debug('random, timeout', config.timeout);
    t.timeoutAfter(config.timeout);

    var I = instanciate();

    I.random().then(function (r) {
        debug ('random', r);
        testDetail(t, r, I.config.uniqueId);
        t.end();
    }).catch(function (e) {
        t.notOk(e, 'failed random');
    });
});
