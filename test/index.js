require('harmonize')(['harmony-generators']);

var metalsmith = require('metalsmith'),
    linkcheck = require('..'),
    fs = require('fs'),
    path = require('path'),
    chai = require('chai');

chai.use(require('chai-fs'));
var assert = chai.assert;

function linkcheck_test(src, options, fn) {
  var once = false;

  metalsmith(src).use(linkcheck.check(options)).build(function(err, files) {
    if (once) return;
    once = true;
    fn(err, files);
  })
}

describe('metalsmith-linkcheck', function() {
  var src = 'test/fixtures/errors';
  var defaults = linkcheck.defaults(path.join(src, 'src'));
  try {
    fs.unlinkSync(defaults.checkFile);
  } catch (err) {};
  try {
    fs.unlinkSync(defaults.failFile);
  } catch (err) {};
  assert.notPathExists(defaults.ignoreFile);
  assert.notPathExists(defaults.checkFile);
  assert.notPathExists(defaults.failFile);

  it('should work and not fail without parameters', function(done){
    linkcheck_test(src, {}, function(err, files) {
      if (err) {
        return done(err);
      }
      assert.pathExists(defaults.checkFile);
      assert.pathExists(defaults.failFile);
      return done();
    });
  });
});
