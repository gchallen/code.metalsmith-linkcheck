var path = require('path'),
    _ = require('underscore');

var _defaults = {
  'optimizeInternal': true,
  'failMissing': false,
  'cacheChecks': true,
  'recheckMinutes': 1440,
  'checkFile': '.links_checked.json',
  'ignoreFile': 'links_ignore.json',
  'failFile': 'links_failed.json'
}
function defaults(src, config) {
  config = config || {};
  config = _.extend(config, _defaults);
  config.checkFile = path.join(src, config.checkFile);
  config.ignoreFile = path.join(src, config.ignoreFile);
  config.failFile = path.join(src, config.failFile);
  return config;
}
module.exports = defaults;
