require('harmonize')(['harmony-generators']);

var assert = require('assert'),
    metalsmith = require('metalsmith'),
    linkcheck = require('..');

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

  it('should work and not fail without parameters', function(done){
    linkcheck_test(src, {}, function(err, files) {
      if (err) return done(err);
      return done();
    });
  });
});
