require('harmonize')(['harmony-generators']);

var metalsmith = require('metalsmith'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    chai = require('chai'),
    jsonfile = require('jsonfile'),
    linkcheck = require('..'),
    linkcheckDefaults = require('../lib/linkcheckDefaults.js');

chai.use(require('chai-fs'));
var assert = chai.assert;

function reset_files(test_defaults) {
  try {
    fs.unlinkSync(test_defaults.checkFile);
  } catch (err) {};
  try {
    fs.unlinkSync(test_defaults.failFile);
  } catch (err) {};
  assert.notPathExists(test_defaults.ignoreFile);
  assert.notPathExists(test_defaults.checkFile);
  assert.notPathExists(test_defaults.failFile);
}

var internal_broken = [
  "/assets/css/broken.css",
  "/assets/img/broken.jpg",
  "/broken.jpg",
  "/broken.html",
  "/www.broken.com",
  "/assets/js/broken.js",
];
var external_broken = [
  "https://www.google.com/broken.css",
  "https://g.twimg.com/broken.png",
  "http://www.google.com/broken.html",
  "http://www.google.com/broken.js"
];
var external_working = [
  "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css",
  "https://g.twimg.com/twitter-bird-16x16.png",
  "http://www.facebook.com",
  "http://www.yahoo.com",
  "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"
];

var all_broken = internal_broken.concat(external_broken);

describe('metalsmith-linkcheck', function() {
  it('should identify all broken links with the default parameters', function(done) {
    var src = 'test/fixtures/errors';
    var defaults = _.clone(linkcheckDefaults.defaults);
    var test_defaults = linkcheckDefaults.processConfig(path.join(src, 'src'), defaults);
    reset_files(test_defaults);

    metalsmith(src)
      .use(linkcheck(defaults))
      .build(function (err) {
        if (err) {
          return done(err);
        }
        assert.pathExists(test_defaults.checkFile);
        var checked = jsonfile.readFileSync(test_defaults.checkFile);
        assert.deepEqual(_.keys(checked).sort(), external_working.sort());
        assert.pathExists(test_defaults.failFile);

        var broken = jsonfile.readFileSync(test_defaults.failFile);
        assert.deepEqual(broken.sort(), all_broken.sort());

        done();
      });
  });
  
  it('should identify only internal broken links when asked to fail', function(done) {
    var src = 'test/fixtures/errors';
    var defaults = _.clone(linkcheckDefaults.defaults);
    defaults.failMissing = true;
    var test_defaults = linkcheckDefaults.processConfig(path.join(src, 'src'), defaults);
    reset_files(test_defaults);

    metalsmith(src)
      .use(linkcheck(defaults))
      .build(function (err) {
        if (!err) {
          return done(new Error("should fail"));
        }
        assert.pathExists(test_defaults.failFile);
        assert.notPathExists(test_defaults.checkFile);

        var broken = jsonfile.readFileSync(test_defaults.failFile);
        assert.deepEqual(broken.sort(), internal_broken.sort());

        done();
      });
  });

  it('should not cache links checks when told not to', function(done) {
    var src = 'test/fixtures/errors';
    var defaults = _.clone(linkcheckDefaults.defaults);
    defaults.cacheChecks = false;
    var test_defaults = linkcheckDefaults.processConfig(path.join(src, 'src'), defaults);
    reset_files(test_defaults);

    metalsmith(src)
      .use(linkcheck(defaults))
      .build(function (err) {
        if (err) {
          return done(err);
        }
        assert.pathExists(test_defaults.failFile);
        assert.notPathExists(test_defaults.checkFile);

        var broken = jsonfile.readFileSync(test_defaults.failFile);
        assert.deepEqual(broken.sort(), broken.sort());

        done();
      });
  });
});
