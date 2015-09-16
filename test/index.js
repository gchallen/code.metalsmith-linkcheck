require('harmonize')(['harmony-generators']);

var metalsmith = require('metalsmith'),
    fs = require('fs'),
    path = require('path'),
    chai = require('chai'),
    linkcheck = require('..'),
    defaults = require('../lib/defaults');

console.log(defaults);
chai.use(require('chai-fs'));
var assert = chai.assert;

function linkcheck_test(src, options, fn) {
  var once = false;

  metalsmith(src).use(linkcheck(options)).build(function(err, files) {
    if (once) return;
    once = true;
    fn(err, files);
  })
}

describe('metalsmith-linkcheck', function() {
  var src = 'test/fixtures/errors';
  var test_defaults = defaults(path.join(src, 'src'));
  try {
    fs.unlinkSync(test_defaults.checkFile);
  } catch (err) {};
  try {
    fs.unlinkSync(test_defaults.failFile);
  } catch (err) {};
  assert.notPathExists(test_defaults.ignoreFile);
  assert.notPathExists(test_defaults.checkFile);
  assert.notPathExists(test_defaults.failFile);

  it('should work and not fail without parameters', function(done){
    linkcheck_test(src, {}, function(err, files) {
      if (err) {
        return done(err);
      }
      assert.pathExists(test_defaults.checkFile);
      assert.pathExists(test_defaults.failFile);
      return done();
    });
  });
});
