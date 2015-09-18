var path = require('path'),
    _ = require('underscore');

var defaults = {
  'verbose': true,
  'failWithoutNetwork': true,
  'failMissing': false,
  'cacheChecks': true,
  'recheckMinutes': 1440,
  'checkFile': '.links_checked.json',
  'ignoreFile': 'links_ignore.json',
  'failFile': 'links_failed.json'
}

function processConfig(config, src) {
  config = config || {};
  config = _.extend(_.clone(defaults), config);
  if (src) {
    config.checkFile = path.join(src, config.checkFile);
    config.ignoreFile = path.join(src, config.ignoreFile);
    config.failFile = path.join(src, config.failFile);
  }
  return config;
}

module.exports = {
  "defaults": defaults,
  "processConfig": processConfig
};
