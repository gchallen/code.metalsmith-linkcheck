require('harmonize')(['harmony-generators']);

var assert = require('assert'),
    metalsmith = require('metalsmith'),
    linkcheck = require('..');

function linkcheck_test(options, fn) {
  var once = false;

  metalsmith('test/fixtures/errors').use(linkcheck(options)).build(function(err, files) {
    if (once) return;
    once = true;
    fn(err, files);
  })
}

describe('metalsmith-linkcheck', function() {
  it('should work and not fail without parameters', function(done){
    linkcheck_test({}, function(err, files) {
      if (err) return done(err);
      return done();
    });
  });
});
