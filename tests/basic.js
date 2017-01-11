var path = require('path')
var tape = require('tape')
var Provider = require('butter-provider')
var debug = require('debug')('butter-provider:tests')

var pkg = require(path.join(process.cwd(), 'package.json'))

var config = {
    args: {},
    timeout: 1000
}

if (pkg.butter) {
    config = Object.assign({}, config, pkg.butter)
}

function load() {
    return require(process.cwd())
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object
}

function instanciate(loadFunction) {
    if (isEmpty(loadFunction)) {
        loadFunction = load;
    }

    var P = loadFunction()
    var testArgs = pkg.butter?pkg.butter.testArgs:null

    return new P(testArgs)
}

function isInValues(element, set) {
    return Object.keys(set).reduce(function (a, c) {
        return a || (element === set[c])
    })
}

function getRandomKey(array) {
    return ~~(Math.random()*(array.length))
}

function getRandom(array) {
    return array[getRandomKey(array)];
}

var runAllTests = function(loadFunction) {
    if (isEmpty(loadFunction)) {
        loadFunction = load;
    }

    function testDetail(t, d, uniqueId) {
        //    console.log('checking details for', d, uniqueId)
        t.ok(d, 'we were able to get details')
        t.ok(d[uniqueId] || d.id, 'we have an unique id')
        t.ok(d.title, 'we have a title')
        t.ok(d.year, 'we have a year')
        t.ok(d.genres, 'we have a genres field')
        t.ok(d.genres.length > 0, 'we have at least 1 genre')
        t.ok(d.rating, 'we have a rating')
        t.ok(d.backdrop, 'we have a backdrop')
        t.ok(d.poster, 'we have a poster')
        t.ok(d.subtitle, 'we have a subtitle')
        t.ok(d.synopsis, 'we have a synopsis')
        t.ok(typeof (d.synopsis) === 'string', 'synopsis is a string')
        t.ok(d.synopsis.length > 16, 'synopsis is at least 16 bytes')
        t.ok(d.runtime, 'we have a runtime')

        var type = d.type
        t.ok(isInValues(type, Provider.ItemType), 'we have a type field which is an item type')

        if (type === Provider.ItemType.MOVIE) {
            t.ok(d.trailer || d.trailer === false, 'we have a trailer')

            t.ok(d.torrents, 'we have a torrents field')
            var quality = getRandom(Object.keys(d.torrents))
            t.ok(isInValues(quality, Provider.QualityType),
                 'we have a quality which is a quality type')
            t.ok(d.torrents[quality], 'we have a quality object')
            t.ok(d.torrents[quality].url, 'we have an url to stream')
            t.ok(d.torrents[quality].size, 'we have the size')
        } else if (type===Provider.ItemType.TVSHOW) {
            t.ok(d.status, 'we have a status')
            t.ok(d.num_seasons, 'we have a num_seasons field')
            t.ok(d.episodes, 'we have an episodes field')
            t.ok(d.episodes.length > 0, 'we have at least 1 episode')

            var episode = getRandom(d.episodes);
            if (!episode) { console.log ('now d is ', d)}
            t.ok(episode.first_aired, 'we have a first aired field')
            t.ok(episode.overview, 'we have an overview')
            t.ok(isFinite(episode.episode), 'we have an episode number')
            t.ok(episode.season, 'we have a season number')
            t.ok(episode.tvdb_id, 'we have a tvdb id')

            t.ok(episode.torrents, 'we have a torrents field')
            var quality = getRandom(Object.keys(d.torrents))
            t.ok(isInValues(quality, Provider.QualityType),
                 'we have a quality which is a quality type')
            t.ok(episode.torrents[quality], 'we have a quality object')
            t.ok(episode.torrents[quality].url, 'we have an url to stream')
        } else {
            t.notOk(type, 'is not a valid type')
        }
    }


    tape.onFinish(function() {
        process.exit(0)
    })

    tape('loads', function (t) {
        console.log(loadFunction)
        var P = loadFunction()

        t.ok(P, 'we were able to load')

        var I = instanciate(loadFunction)

        t.ok(I, 'we were able to instanciate')

        t.ok(I.config.name, 'we have a name')
        t.ok(I.config.uniqueId, 'we have a uniqueId')
        t.ok(I.config.tabName, 'we have a tabName')

        t.ok(I.args, 'we have an args object')

        t.end()
    })

    tape('fetch', function (t) {
        debug('fetch, timeout', config.timeout)
        t.timeoutAfter(config.timeout)

        var I = instanciate(loadFunction)

        I.fetch().then(function (r) {
            debug ('fetch', r)
            t.ok(r, 'we were able to fetch')
            t.ok(r.hasMore===true || r.hasMore===false, 'we have a hasMore field that is a boolean')
            t.ok(r.results, 'we have a results field')
            t.ok(r.results.length > 0, 'we have at least 1 result')

            var uniqueIds = I.extractIds(r)
            var key = getRandomKey(uniqueIds)
            console.log('will try to get details for key', key)
            t.ok(uniqueIds, 'extractIds')
            I.detail(uniqueIds[key], r.results[key]).then(function (d) {
                debug ('detail', d)
                testDetail(t, d, I.config.uniqueId)
                t.end()
            }).catch(function (e) {
                console.log('ERROR in details', e)
                t.notOk(e, 'failed detail')
            })
        }).catch(function (e) {
            console.log('ERROR in fetch', e)
            t.notOk(e, 'failed fetch')
        })
    })

    tape('random', function (t) {
        debug('random, timeout', config.timeout)
        t.timeoutAfter(config.timeout)

        var I = instanciate(loadFunction)

        I.random().then(function (r) {
            debug ('random', r)
            testDetail(t, r, I.config.uniqueId)
            t.end()
        }).catch(function (e) {
            t.notOk(e, 'failed random')
        })
    })
}

runAllTests.apply(this, arguments);
module.exports = runAllTests;
