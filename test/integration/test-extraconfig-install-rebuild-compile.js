/**
 * Test description
 * ================
 *
 * Starting with a project using package.json with jam deps defined and
 * extra require.js config.
 * - jam publish package-one
 * - jam publish package-two (depends on package-one)
 * - jam install, test installation succeeded
 * - jam ls, test packages are listed
 * - jam remove package-two, test it's removed
 */


var couchdb = require('../../lib/couchdb'),
    logger = require('../../lib/logger'),
    env = require('../../lib/env'),
    utils = require('../utils'),
    async = require('async'),
    http = require('http'),
    path = require('path'),
    ncp = require('ncp').ncp,
    fs = require('fs'),
    _ = require('underscore');


var pathExists = fs.exists || path.exists;


logger.clean_exit = true;

// CouchDB database URL to use for testing
var TESTDB = process.env['JAM_TEST_DB'],
    BIN = path.resolve(__dirname, '../../bin/jam.js'),
    ENV = {JAM_TEST: 'true', JAM_TEST_DB: TESTDB};

if (!TESTDB) {
    throw 'JAM_TEST_DB environment variable not set';
}

// remove trailing-slash from TESTDB URL
TESTDB = TESTDB.replace(/\/$/, '');


exports.setUp = function (callback) {
    // change to integration test directory before running test
    this._cwd = process.cwd();
    process.chdir(__dirname);

    // recreate any existing test db
    couchdb(TESTDB).deleteDB(function (err) {
        if (err && err.error !== 'not_found') {
            return callback(err);
        }
        // create test db
        couchdb(TESTDB).createDB(callback);
    });
    
    delete GLOBAL.pluginCalled;
};

exports.tearDown = function (callback) {
    // change back to original working directory after running test
    process.chdir(this._cwd);
    // delete test db
    couchdb(TESTDB).deleteDB(callback);
    
    delete GLOBAL.pluginCalled;
};


exports['project with package.json'] = {

    setUp: function (callback) {
        this.project_dir = path.resolve(env.temp, 'jamtest-' + Math.random());
        // set current project to empty directory
        ncp('./fixtures/project-extraconfig', this.project_dir, callback);
    },

    /*
    tearDown: function (callback) {
        var that = this;
        // timeout to try and wait until dir is no-longer busy on windows
        //utils.myrimraf(that.project_dir, callback);
    },
    */

    'install, rebuild, compile': function (test) {
        test.expect(7);
        var that = this;
        process.chdir(that.project_dir);
        var pkgone = path.resolve(__dirname, 'fixtures', 'package-one'),
            pkgplugin = path.resolve(__dirname, 'fixtures', 'package-plugin'),
            pkgthree = path.resolve(__dirname, 'fixtures', 'package-three');

        async.series([
            async.apply(utils.runJam, ['publish', pkgone], {env: ENV}),
            async.apply(utils.runJam, ['publish', pkgthree], {env: ENV}),
            async.apply(utils.runJam, ['publish', pkgplugin], {env: ENV}),
            async.apply(utils.runJam, ['install'], {env: ENV}),
            function (cb) {
                // test that main.js was installed from package
                var packagejson = require(path.resolve(that.project_dir, 'package.json'));
                var requireconfig = require(path.resolve(
                    that.project_dir,
                    'jam/require.config.js'
                ));
                test.ok(packagejson.jam.requireconfig);
                test.ok(requireconfig);
                test.same(packagejson.jam.requireconfig['package-one'], requireconfig['package-one']);
                cb();
            },
            async.apply(utils.runJam, ['rebuild'], {env: ENV}),
            function (cb) {
                // test that main.js was installed from package
                var packagejson = require(path.resolve(that.project_dir, 'package.json'));
                var requireconfig = require(path.resolve(
                    that.project_dir,
                    'jam/require.config.js'
                ));
                test.ok(packagejson.jam.requireconfig);
                test.ok(requireconfig);
                test.same(packagejson.jam.requireconfig['package-one'], requireconfig['package-one']);
                cb();
            },
            async.apply(utils.runJam, ['compile', 'output.js', '--no-minify', '--almond'], {env: ENV}),
            function (cb) {
            	console.log(that.project_dir);
            	var content = fs.readFileSync('output.js').toString();
            	test.ok(/package-plugin-success/.test(content));
                cb();
            }
        ],
        test.done);
    }

};
