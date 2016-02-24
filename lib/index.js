var debug = require('debug')('metalsmith-linkcheck'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    _ = require('underscore'),
    cheerio = require('cheerio'),
    jsonfile = require('jsonfile'),
    request = require('request'),
    validator = require('validator'),
    devnull = require('dev-null');

request = request.defaults({ jar: request.jar() });
jsonfile.spaces = 4;

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

function linkcheck(config) {
  
  return function(files, metalsmith, done) {

    config = processConfig(config);
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
      ignore_links = JSON.parse(files[config.ignoreFile].contents);
    } catch (err) {};

    var network = true;

    async.series([
        function (callback) {
          async.forEachOfLimit(htmlfiles, 8, function(file, filename, finished) {
            var $ = cheerio.load(file.contents);

            var all_links = []
            all_links = all_links.concat($("a:not(.link_exception a)")
								.not('.link_exception')
								.map(function () { 
              return $(this).attr('href');
            }).get());
            all_links = all_links.concat($("img:not(.link_exception img)")
								.not('.link_exception')
								.map(function () {
              return $(this).attr('src');
            }).get());
            all_links = all_links.concat($("link:not(.link_exception link)")
								.not('.link_exception')
								.map(function () {
              return $(this).attr('href');
            }).get());
            all_links = all_links.concat($("script:not(.link_exception script)")
								.not('.link_exception')
								.map(function () {
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
              if (config.verbose) {
                console.log("metalsmith-linkcheck: network failure");
              }
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
              if (config.verbose) {
                console.log("metalsmith-linkcheck: skipping external links due to network failure");
              }
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
            if (config.verbose) {
              console.log("metalsmith-linkcheck: links failed; see " + config.failFile);
            }
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
            var options = {
              'uri': link,
              'headers': {
                'User-Agent': "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410."
              },
              'maxRedirects': 5
            };
            request(options, function (error, response, body) {
              if (error || !response || response.statusCode != 200) {
                delete(checked_links[link]);
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
              if (config.verbose) {
                console.log("metalsmith-linkcheck: links failed; see " + config.failFile);
              }
              if (config.failMissing) {
                removeFiles(files, config);
                done(new Error("failed links: " + failed.join()));
                return;
              }
            } else {
              try {
                fs.unlinkSync(path.join(metalsmith.source(), config.failFile));
              } catch (err) {};
            }
            removeFiles(files, config);
            done();
          });
       }
    ]);
  }
}

exports = module.exports = linkcheck;
exports.defaults = defaults;
exports.processConfig = processConfig;
