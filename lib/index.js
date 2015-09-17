var debug = require('debug')('metalsmith-linkcheck'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    _ = require('underscore'),
    cheerio = require('cheerio'),
    jsonfile = require('jsonfile'),
    request = require('request'),
    validator = require('validator'),
    linkcheckDefaults = require('./linkcheckDefaults.js');
request = request.defaults({ jar: request.jar() });

var externalPattern = /^(https?|ftp|file|data):/;
function isExternalLink(link) {
  return externalPattern.test(link);
}
  
function isRelativeLink(link) {
  return (link.lastIndexOf("/", 0) === -1);
}

var protocolIndependentPattern = /^\/\//;
function isProtocolIndependentLink(link) {
  return protocolIndependentPattern.test(link);
}

function removeFiles(files, config) {
  if (files[config.checkFile]) {
    delete(files[config.checkFile]);
  }
  if (files[config.failFile]) {
    delete(files[config.failFile]);
  }
  if (files[config.ignoreFile]) {
    delete(files[config.ignoreFile]);
  }
};

module.exports = function (config) {
  
  return function(files, metalsmith, done) {

    config = linkcheckDefaults.processConfig(config);
    config.optimizeInternal = true;
  
    var metadata = metalsmith.metadata();
    var check_time = metadata.date || new Date();
    
    var filelinks = {}, alllinks = {};
    
    var htmlfiles = _.pick(files, function(file, filename) {
      return (path.extname(filename) === '.html');
    });
          
    var checked_links = {}, ignore_links = [], internal_failed = [];
    if (config.cacheChecks) {
      try {
        checked_links = JSON.parse(files[config.checkFile].contents);
      } catch (err) { };
    }
    try {
      ignore_links = JSON.parse(files[config.ignoreFile]);
    } catch (err) {};

    var network = true;

    async.series([
        function (callback) {
          async.forEachOfLimit(htmlfiles, 8, function(file, filename, finished) {
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
              if (isProtocolIndependentLink(link)) {
                return "http://" + link.substring(2);
              } else if (!isExternalLink(link) && isRelativeLink(link)) {
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
          request("http://www.google.com", function (error, response, body) {
            if (error || !response || response.statusCode != 200) {
              if (config.failWithoutNetwork) {
                removeFiles(files, config);
                done(new Error("network failure"));
                return;
              } else {
                network = false;
              }
            }
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
            async.mapLimit(internal, 8, function (link, finished) {
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
            if (!network) {
              removeFiles(files, config);
              done();
              return;
            }
            async.mapLimit(internal, 8, function (link, finished) {
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
          if (internal_failed.length > 0 && config.failMissing) {
            jsonfile.writeFileSync(path.join(metalsmith.source(), config.failFile),internal_failed);
            removeFiles(files, config);
            done(new Error("failed links: " + internal_failed.join()));
            return;
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
            if (config.cacheChecks) {
              jsonfile.writeFileSync(path.join(metalsmith.source(), config.checkFile), checked_links);
            }
            var failed = _.union(internal_failed, _.reject(results, function (e) { return !e; }));
            if (failed.length > 0) {
              jsonfile.writeFileSync(path.join(metalsmith.source(), config.failFile), failed);
              if (config.failMissing) {
                removeFiles(files, config);
                done(new Error("failed links: " + failed.join()));
                return;
              }
            } else {
              try {
                fs.unlinkSync(config.failFile);
              } catch (err) {};
            }
            removeFiles(files, config);
            done();
          });
       }
    ]);
  }
}
