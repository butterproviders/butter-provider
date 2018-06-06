# Butter Provider

[Butter Project](https://butterproject.org) is a toolkit to build VOD platforms, this component is the
base class for Providers.

A `Provider` in the Butter terminology is an accessor for media content, it
provides items of type 'movie' or 'tvshow' that can be displayed in a Butter
app.

Butter will automatically load any npm package installed (listed in
`package.json`) that matches the `/butter-provider-.*/` regex.

# Documentation
A `Butter Provider` is just a npm package that needs to export a specific
API that we describe hereafter.

Note that if you want to use the autoload features in Butter you should name
your module `butter-provider-${something}`.

## Writing a Provider
We provide a base provider in `butter-provider` that we recommend extending,
it handles caching and a few other bootstrapping quirks, but formally
speaking it's not required.

Here we'll be creating a provider for the vodo.net service.

### Create a npm module
Create a directory and init a new npm module:

``` shell
mkdir butter-provider-vodo
cd butter-provider-vodo
npm init
```

### Depend on butter-provider
First install the npm module and add it as a dependency.

``` shell
npm i --save butter-provider
```

Then edit your `index.js`.

``` javascript
'use strict';

var Provider = require('butter-provider');
var inherits = require('util').inherits;

function Vodo() {
    if (!(this instanceof Vodo)) {
        return new Vodo();
    }

    Provider.call(this);
    this.apiUrl = this.args.urlList
}
inherits(Vodo, Provider);
```

### Declare a config object

``` javascript
Vodo.prototype.config = {
    name: 'vodo',
    tabName: 'Vodo',
    defaults: {
        urlList: ['http://butter.vodo.net/popcorn']
    },
    argTypes: {
       urlList: Provider.ArgTypes.ARRAY
    }
    /* legacy: should be removed */
    // subtitle: 'ysubs',
    // metadata: 'trakttv:movie-metadata'
};
```

### Implement required Methods
You need to supply code for at least `fetch`, other methods like `detail`,
`extractIds` and `resolveStream` have default implementations that should
work in most cases. That said you probably want to implement those too to be
smarter than us.

See the API documentation hereafter for more details.

### Use our generic Tests
We have tests for you, to get them running you need to do 2 things;

First add a devDependency on tape and debug so that you can run the tests:
``` shell
npm i --save-dev tape debug
```

Then you need to tell npm what to run on `npm test`, and tell the tests how
to call your provider using the `butter.testArgs` key:
``` javascript
  "scripts": {
    "test": "tape ./node_modules/butter-provider/tests/*"
  },
  "butter": {
    "timeout": 20000,
    "testArgs": "vodo?urlList=[ \
        \"http://butter.vodo.net/popcorn\",  \
        \"https://butter.vodo.net/popcorn\", \
        \"http://localhost:8080/popcorn\"    \
    ]"
  },
```

## API

### config (Object)

The config object should be attached to the prototype (i.e. use
the `Provider.prototype.config = {}` syntax), and it should have the
following fields:

``` javascript
Provider.prototype.config = {
     name: String,      // will be used in logs to refer to your provider
     tabName: String,   // will appear as the description of the tab
     filters: [Object], // (optional) a list of the filters supported,
                        // see the documentation below
     argTypes: Object || String, // (optional) the args this provider supports
     defaults: Object,  // (optional) default values for the args object
     /* DEPRECATED: should be removed */
     subtitle: String,  // (optional) name of the subtitle provider
     metadata: String   // (optional) name of the metadata provider
     uniqueId: String,  // the name of the field we should use to unify assets
}
```

#### filters
The filters object is a collection of mappings between filter-keys and their
pretty-printed version in the app. They are used to limit the content in the
list view and are passed back to `fetch()` when modified.

the filters object is of the shape:
``` javascript
var filters = {
    [filterType]: {key: name}
}
```

We currently support 3 `filterTypes`:
 - `genres`
 - `sorters`
 - `types` (optional)

`Provider.DefaultFilters` has definitions for genres and sorters that will
be used if none are provided.


#### argTypes
The `argTypes` object is a mapping between arg names and `Provider.ArgType` types,
currently these are the supported values:

``` javascript
    Provider.ArgType.ARRAY,   // expects a string of values separated by ',' (JSON.parse)
    Provider.ArgType.OBJECT,  // expects a string of json (JSON.parse)
    Provider.ArgType.BOOLEAN, // expects a string that evaluates to a boolean
    Provider.ArgType.NUMBER,  // expects a string that can be passed to Number()
    Provider.ArgType.STRING,  // expects a string
```

These types will be automatically instanciated into the `args` property of
the created class, in the long run, there will be UI in Butter to modify
those declared args from the settings panels.

It is not required that you use this mechanism (i.e. you can parse your args
as you please in your butter-provider) but it will sure save you some
headaches.

Note that it can be a string in the `uri` form, we will then split it with
`querystring.parse` and convert it according to the right
`Provider.ArgType`, this is the mechanism that is in use when you pass this
kind of queries:

``` javascript
    vodo?urlList=[ \
        "http://butter.vodo.net/popcorn",  \
        "https://butter.vodo.net/popcorn", \
        "http://localhost:8080/popcorn"    \
    ]
```

#### defaults
You can provide default values for the `argTypes` object. Any JavaScript Object
will do.

Note that while we currently do not do type checking on those we may very
well start doing so in the future, so make sure the default you provide maps
the `Provider.ArgType` for that element.

### fetch (Object: filters -> (promise) Object)
The fetch method is the first called of your provider, it's used to show the
content when users open Butter. Keep it small, keep it simple, keep it
fast, as load time will depend on performance of fetch. Grab the bare
minimum of data you need, you'll have other opportunities to enrich that
data in subsequent calls (like `detail` or `resolveStream`).

The fetch method takes in a set of filters that can have the following keys:
``` javascript
var filters = {
    keywords: [String],          // keywords to search for
    genre: String,               // limit to this genre
    order: Provider.OrderType,   // sort order (ASC, DESC)
    sorter: Provider.SorterType, // sorter type (NAME, RATING, POPULARITY)
    limit: Number,               // number of elements to return
}
```

with Provider.OrderType being:
``` javascript
    Provider.Ordertype.ASC,    // items are sorted in ascending order
    Provider.Ordertype.DESC,   // items are sorted in descending order
    Provider.OrderType.NULL    // items are not sorted
```

with Provider.SorterType being:
``` javascript
    Provider.Sortertype.NAME,        // items are sorted by name
    Provider.Sortertype.RATING,      // items are sorted by rating
    Provider.Sortertype.POPULARITY,  // items are sorted by popularity
    Provider.SorterType.NULL         // items are not sorted
```

The fetch method returns a promise that resolves to an object of the shape:
``` javascript
var fetchReturn = {
    results: [Object],  // returned result items
    hasMore: Boolean    // can the provider get more results ?
}
```

The results items can have any shape but are required to have at least:
``` javascript
var result = {
    id: String,                // the unique id
    title: String,             // title of the asset
    year: Number,              // year of release
    genres: [String],          // a free list of genre keywords
    rating: Number,            // a 0-100 rating value
    poster: String,            // url to the poster image
    type: Provider.ItemType,   // used by the browser to decide how to show the item
                               // (MOVIE, TVSHOW)
    num_seasons: Number        // the number of seasons available to display
                               // only in the case of Provider.ItemType.TVSHOW
}
```

Provider.ItemType can be one of:
``` javascript
    Provider.ItemType.MOVIE,  // item is a Movie
    Provider.ItemType.TVSHOW  // item is a TvShow
```

### detail (String: id, Object old_data -> (promise) Object)
The detail method allows you to fetch more metadata from your API when
presenting a specific asset, it returns a result object as described in
`fetch`, and takes the id and the data returned by previous `fetch` calls as
an argument.

It is important, to split detail and fetch data gets, as it can be heavy on
your API endpoint to get all those details at once.

Note that the expected shape of detail results are slightly different for
`Provider.ItemType.MOVIE` and `Provider.ItemType.TVSHOW`.

Note that the default implementation will just return the object untouched,
you don't need to implement a function like:
``` javascript
Provider.prototype.detail = function (torrent_id, old_data) {
    return Q(old_data);
};
```

The required info is:
``` javascript
var detail = {
    id: String,                // the unique id
    title: String,             // title of the asset
    year: Number,              // year of release
    genres: [String],          // a free list of genre keywords
    rating: Number,            // a 0-100 rating value
    poster: String,            // url to the poster image
    type: Provider.ItemType    // used by the browser to decide how to show the item
                               // (MOVIE, TVSHOW)
    num_seasons: Number,       // the number of seasons available to show
                               // only in the case of Provider.ItemType.TVSHOW
//--- all of the above is already required by fetch(), new stuff here: ---
    runtime: Number,           // the runtime of the item
    backdrop: String,          // url to the backdrop image
    subtitle: {url: String},   // language -> url subs mapping
    synopsis: String,          // a short description of the asset
}
```

#### `Provider.ItemType.MOVIE`
The `Provider.ItemType.MOVIE` has the following additional fields:
``` javascript
var detail = {
//--- including all the fields of the generic detail object
    sources: Object,          // sources object
    trailer: String           // url of the trailer, formatted for butter-streamers
}
```

#### `Provder.ItemType.TVSHOW`
The `Provider.ItemType.TVSHOW` also has a few additional fields to include:
``` javascript
var detail = {
//--- including all the fields of the generic detail object
    status: String,              // the status of the item
    episodes: [Object],          // the episodes to display
}
```

The `episodes` array will have the following shape:
``` javascript
{
    sources: Object               // a sources Object
    watched: Boolean              // indication if an episode has been watched
    first_aired: Number,          // epoch time when the episode was first aired
    overview: String,             // small description of the episode
    episode: Number,              // episode number of the season
    season: String,               // season number of the episode
    tvdb_id: Number               // the tvdb id of the episode
}
```

#### sources Object
The end goal of these methods is to return `sources` objects that have the
following shape:

Note that the 'torrent' name is a bit confusing and really a legacy name, it
should be called 'resources'.

``` javascript
var sources = {
    [Provider.QualityType]: {     // the quality of the episode
        url: String,              // the resource's url, formatted for butter-streamers
        size: Number,             // the resource's descriptor size (magnet/torrent/hls playlist)
                                  // only for Provider.ItemType.MOVIE
        filesize: String          // (optional) the resource's main video filesize
        peers: Number,            // (optional) number of seeds
        seeds: Number,            // (optional) number of peers
    }
}
```

With Provider.QualityType being:
``` javascript
    Provider.QualityType.DEFAULT   // The default object to stream
    Provider.QualityType.LOW       // 480p quality
    Provider.QualityType.MEDIUM    // 720p quality
    Provider.QualityType.HIGH      // 1080p quality
```

### extractIds ([Object]: items -> [String])
This method is used to keep a cache of the content in a Butter app. The
generic implementation is:

``` javascript
Provider.prototype.extractIds = function (items) {
    return _.pluck(items.results, 'id');
};
```

### (optional) resolveStream (src, config, data -> (promise) String)
This method is used to let the provider decide what the end url should be
according to some config passed by the apps. It's main purpose is to allow
the selection of different languages, but in the future it may allow for
deeper customizations (as for instance choosing a streaming technology).

The default handler will just return `src` that is the legacy value
providers are required to return in `fetch` and `details` for torrent data.

Currently `config` will have this shape:
``` javascript
{
  audio: String,
}
```

`data` will be whatever data was returned from the latest `fetch` or
`details` for the current media, it is given raw so that you can control
where to 'hide' the urls you will want to switch on languages switches.

### (optional) random (void -> (promise) Object)
Returns a random `result item` as described in `detail`.

### (optional) update (void -> (promise) [Object])
Allows to notify the Provider it can update it's internal cache
(not used).
