var debug = require('debug')('metalsmith-linkcheck'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore'),
    cheerio = require('cheerio'),
    jsonfile = require('jsonfile'),
    request = require('request');

function isExternalLink(link) {
  if ((link.lastIndexOf("http:", 0) == 0) ||
      (link.lastIndexOf("https:", 0) == 0) ||
      (link.lastIndexOf("//", 0) == 0)) {
    return true;
  } else {
    return false;
  }
}
  
function isRelativeLink(link) {
  if (isExternalLink(link)) {
    return false;
  } else {
    return (link.lastIndexOf("/", 0) === -1);
  }
}

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
module.exports.defaults = defaults;

module.exports.check = function (config) {
  
  return function(files, metalsmith, done) {

    config = defaults(metalsmith.source(), config);
  
    if (!config.optimizeInternal && config.internalHost === undefined) {
      done(new Error("must provide config.internalHost when not optimizing internal link checks"));
    }
    
    var metadata = metalsmith.metadata();
    var check_time = metadata.date || new Date();
    
    var filelinks = {}, alllinks = {};
    
    var htmlfiles = _.pick(files, function(file, filename) {
      return (path.extname(filename) === '.html');
    });
          
    var checked_links = {}, ignore_links = [], internal_failed = [], external_failed = [];
          
    if (config.cacheChecks) {
      try {
        checked_links = jsonfile.readFileSync(config.checkFile);
      } catch (err) {};
    }
    try {
      ignore_links = jsonfile.readFileSync(config.ignoreFile);
    } catch (err) {};

    async.series([
        function (callback) {
          async.forEachOf(htmlfiles, function(file, filename, finished) {
            var $ = cheerio.load(file.contents);

            var all_links = []
            all_links = all_links.concat($("a").map(function () { 
              return $(this).attr('href');
            }).get());
            all_links = all_links.concat($("img").map(function () {
              return $(this).attr('src');
            }).get());
            all_links = all_links.concat($("link").map(function () {
              return $(this).attr('href');
            }).get());
            all_links = all_links.concat($("script").map(function () {
              return $(this).attr('src');
            }).get());
            all_links = _.reject(all_links, function (link) {
              return ((link.lastIndexOf("#", 0) == 0) || (link.lastIndexOf("mailto:", 0) == 0));
            });
            all_links = _.map(all_links, function (link) {
              if (isRelativeLink(link)) {
                return ("/" + filename.substring(0, filename.lastIndexOf("/") + 1) + link);
              } else {
                return link;
              }
            });
            filelinks[filename] = all_links;
            finished();
          },
          function () {
            alllinks = _.uniq(_.flatten(_.map(filelinks, _.values)));
            callback();
          });
        },
        function (callback) {
          var internal = _.map(_.reject(alllinks, isExternalLink), function (e) { 
            return e.toLowerCase();
          });

          if (config.optimizeInternal) {
            var filenames = _.map(_.keys(files), function (e) {
              return ("/" + e).toLowerCase();
            });
            async.map(internal, function (link, finished) {
              if (ignore_links.indexOf(link) !== -1) {
                finished(null, null);
              } else if (filenames.indexOf(link) !== -1) {
                finished(null, null);
              } else if ((link.indexOf("/", link.length - 1) !== -1) &&
                         (filenames.indexOf(link + "index.html") !== -1)) {
                finished(null, null);
              } else if ((link.indexOf("/", link.length - 1) === -1) &&
                         (filenames.indexOf(link + "/index.html") !== -1)) {
                finished(null, null);
              } else {
                finished(null, link);
              }
            }, function (err, results) {
              internal_failed = _.reject(results, function (e) { return !e; });
              callback();
            });
          } else {
            async.mapLimit(internal, 32, function (link, finished) {
              if (ignore_links.indexOf(link) !== -1) {
                finished(null, null);
                return;
              }
              request(config.internalHost + link, function (error, response, body) {
                if (error || !response || response.statusCode != 200) {
                  finished(null, link);
                } else {
                  finished(null, null);
                }
              });
            }, function (err, results) {
              internal_failed = _.reject(results, function (e) { return !e; });
              callback();
            });
          }
        },
        function (callback) {
          debug("failed links: " + internal_failed.join());
          if (internal_failed.length > 0) {
            if (config.failMissing) {
              done(new Error("failed links: " + internal_failed.join()));
            }
          }
          callback();
        },
        function (callback) {
          var external = _.filter(alllinks, isExternalLink);
          
          async.mapLimit(external, 8, function (link, finished) {
            if (ignore_links.indexOf(link) !== -1) {
              finished(null, null);
              return;
            }
            if (checked_links[link]) {
              diff = check_time - (new Date(checked_links[link]));
              if (diff > 0 && diff < (config.recheckMinutes * 60 * 1000)) {
                finished(null, null);
                return;
              }
            }
            request(link, function (error, response, body) {
              if (error || !response || response.statusCode != 200) {
                finished(null, link);
              } else {
                checked_links[link] = check_time;
                finished(null, null);
              }
            });
          }, function (err, results) {
            var external_failed = _.reject(results, function (e) { return !e; });
            if (config.cacheChecks) {
              jsonfile.writeFileSync(config.checkFile, checked_links);
            }
            if (external_failed.length > 0) {
              debug("failed links: " + external_failed.join());
              if (config.failMissing) {
                done(new Error("failed links: " + external_failed.join()));
              }
            }
            jsonfile.writeFileSync(config.failFile, _.union(internal_failed, external_failed));
            callback();
          });
       }
    ],
    function (err) {
      done(err);
    });
  }
}
