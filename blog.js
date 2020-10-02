var Metalsmith = require('metalsmith');
var collections = require('metalsmith-collections');
var each = require("metalsmith-each");
var elevate = require('metalsmith-elevate');
var feed = require('metalsmith-feed');
var file_metadata = require("metalsmith-filemetadata");
var ignore = require('metalsmith-ignore');
var layout = require('metalsmith-layouts');
var less = require('metalsmith-less');

var child_process = require('child_process');
var path = require('path');
var which = require('which');
var util = require('util');

// set the index.html file from the single file that has index:true in its metadata
var index = function(files, metalsmith, done) {
    for(var file in files) {
        var f = files[file];
        if(f.index != undefined) {
            if(files['index.html'] != undefined) {
                done(new Error("Multiple files with index property"));
            }
            files['index.html'] = f;
        }
    }
    done();
}

// convert multimarkdown files to html
// for now only works with the posts
var mmd = function(options = {}) {

    // verify that mmd is installed
    // (this will throw an error if it's not installed)
    try {
        var mmdVersion = which.sync("pandoc");
    }
    catch(err) {
        throw new Error("Pandoc is not installed.  See http://pandoc.org");
    }

    var collectionName = options.collection;
    if(collectionName === 'undefined') {
        throw new Error('collection option is required. See metalsmith-collections.');
    }

    return function(files, metalsmith, done) {
        var metadata = metalsmith.metadata();
        if(metadata.collections === 'undefined') {
            done(new Error('collections is not configured.  See metalsmith-collections.'));
        }
        var collection = metadata.collections[collectionName];
        for(var file in collection) {
            console.log('mmd: ' + file);
            var cmd = "pandoc -f markdown -t html ";
            if(file == 'metadata') {
                continue;
            }
            var html = child_process.execSync(cmd, { input: collection[file].contents });
            collection[file].html = html;
            var newFile = collection[file].source;
            newFile = path.dirname(newFile) + path.sep + path.basename(newFile, '.md') + ".html";
            files[newFile] = files[collection[file].source];
            if(files[collection[file].source])
            files[newFile].contents = html;
            delete files[collection[file].source];
        }
        done();
    }
}

// remove certain files from those to be processed (e.g., less files)
// the files to be removed are defined in a collection
var rmdest = function(options = {}) {

    var collectionName = options.collection;
    if(collectionName === 'undefined') {
        throw new Error('collection option is required. See metalsmith-collections.');
    }

    return function(files, metalsmith, done) {
        var metadata = metalsmith.metadata();
        if(metadata.collections === 'undefined') {
            done(new Error('collections is not configured.  See metalsmith-collections.'));
        }
        var collection = metadata.collections[collectionName];
        for(var file in collection) {
            if(file == 'metadata') {
                continue;
            }
            delete files[collection[file].source];
        }
        done();
    }
}

Metalsmith(__dirname)
    .destination('./site')
    .metadata({
        site: {
            title: "The RPGist",
            url: "http://rpg.ist",
            author: "d20@icosahedron.org (Jay Kint)"
        },
        title: "The RPGist",
        url: "http://rpg.ist",
        author: "Jay Kint",
        description: "A blog about RPGs from someone who plays them.",
        credits: "Title graphic from <a href=\"http://www.homestarrunner.com/sbemail50.html\">Homestar Runner SB E-mail 50</a>.<br> \
        Site design inspired by <a href=\"https://startbootstrap.com/template-overviews/clean-blog/\">Start Bootstrap Clean Blog theme</a>.<br> \
        Photo altered from original by <a href=\"https://unsplash.com/@emilep?photo=xrVDYZRGdw4\">Emile Perron</a> under <a href=\"http://creativecommons.org/publicdomain/zero/1.0/\">Creative Commons Zero</a>.<br> \
        Subscribe to the <a href=\"http://flagrantsystemerror.com/rss.xml\">RSS feed</a> to receive updates."
    })
    .use(ignore([
        'templates/*',
        '**/*~',  // emacs droppings
        '**/.*',  // hidden files
        '**/*.html', // all the HTML files are ignored
    ]))
    .use(each(function(file, filename) {
        file.source = filename;
        return filename;
    }))
    .use(collections({
        mdfiles:
            { pattern: '**/*.md',
              sortBy: 'source',
              refer: false },
        lessfiles:
            { pattern: '**/*.less',
              sortBy: 'source',
              refer: false }
    }))
    // requires the source parameter created above
    .use(mmd({
        collection: 'mdfiles'
    }))
    .use(each(function(file, filename) {
        console.log(util.inspect(file, { showHidden: true, depth: null, color: true }));
    }))
    // just proces the one file
    .use(less({
        pattern: '**/post.less',
        render: { paths: ['src/styles'] }
    }))
    .use(rmdest({ collection: 'lessfiles' }))
    .use(file_metadata([
        {
            pattern : "posts/*.html",
            metadata: {
                layout: "post.mustache",
                posts_url: "/",
                images_url: "/images/",
                navbar_url: "/navbar/",
                styles_url: "/styles/",
                js_url: "/js/"
            },
            preserve: true
        },
        {
            pattern : "navbar/*.html",
            metadata: {
                layout: "post.mustache",
                posts_url: "/",
                images_url: "/images/",
                navbar_url: "/navbar/",
                styles_url: "/styles/",
                js_url: "/js/"
            },
            preserve: true
        },
        {
            pattern : "pages/*.html",
            metadata: {
                layout: "page.mustache",
                images_url: "/images/",
                styles_url: "/styles/",
            },
            preserve: true
        },
    ]))
    .use(layout({
        engine: 'mustache',
        directory: 'src/templates',
    }))
    .use(elevate({
        pattern: 'posts/*.html',
        depth: -1
    }))
    .use(index)
    .use(each(function(file, filename) {
        console.log("post: " + filename);
        return filename;
    }))
    .clean(true)
    .build(function(err) {
        if (err) {
            console.log(err);
            throw err;
        }
    });
