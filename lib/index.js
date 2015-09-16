var debug = require('debug')('metalsmith-linkcheck'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore'),
    cheerio = require('cheerio'),
    jsonfile = require('jsonfile'),
    request = require('request');

module.exports = linkcheck;

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

function htmlfiles(files) {
  return _.pick(files, function(file, filename) {
    return (path.extname(filename) === '.html');
  });
}

function linkcheck(config) {

  config = config || {};
  if (config.optimizeInternal === undefined) {
    config.optimizeInternal = true;
  }
  if (config.failMissing === undefined) {
    config.failMissing = false;
  }
  if (config.cacheChecks === undefined) {
    config.cacheChecks = true;
  }
  if (config.recheckMinutes === undefined) {
    config.recheckMinutes = 1440;
  }
  if (config.checkFile === undefined) {
    config.checkFile = 'links_checked.json';
  }
  if (config.ignoreFile === undefined) {
    config.ignoreFile = 'ignore_file.json';
  }
  if (!config.optimizeInternal && config.internalHost === undefined) {
    done(new Error("must provide config.internalHost when not optimizing internal link checks"));
  }

  return function(files, metalsmith, done) {
    
    var metadata = metalsmith.metadata();
    var filelinks = {}, alllinks = {};
    var check_time = metadata.date || new Date();
   
    async.series([
        function (callback) {
          async.forEachOf(htmlfiles(files), function(file, filename, finished) {
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
            callback();
          });
        },
        function (callback) {
          alllinks = _.uniq(_.flatten(_.map(filelinks, _.values)));
          var internal = _.map(_.reject(alllinks, isExternalLink), function (e) { 
            return e.toLowerCase();
          });
          var filenames = _.map(_.keys(files), function (e) {
            return ("/" + e).toLowerCase();
          });
          if (config.optimizeInternal) {
            async.map(internal, function (link, finished) {
              if (filenames.indexOf(link) !== -1) {
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
              internal = _.reject(results, function (e) { return !e; });
              debug("failed links: " + internal.join());
              if (internal.length > 0) {
                if (config.failMissing) {
                  done(new Error("failed links: " + internal.join()));
                }
              }
              callback();
            });
          } else {
            callback();
          }
        },
        function (callback) {
          var external = _.filter(alllinks, isExternalLink);
          
          var checked_links = {};
          var ignore_links = [];
          var checked_file = path.join(metalsmith.source(), config.checkFile);
          var ignore_file = path.join(metalsmith.source(), config.ignoreFile);
          
          if (config.cacheChecks) {
            try {
              checked_links = jsonfile.readFileSync(checked_file);
            } catch (err) {};
          }
          try {
            ignore_links = jsonfile.readFileSync(ignore_file);
          } catch (err) {};

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
            external = _.reject(results, function (e) { return !e; });
            if (config.cacheChecks && _.keys(checked_links).length > 0) {
              jsonfile.writeFileSync(checked_file, checked_links);
            }
            if (external.length > 0) {
              debug("failed links: " + external.join());
              if (config.failMissing) {
                done(new Error("failed links: " + external.join()));
              }
            }
            callback();
          });
       }
    ],
    function (err) {
      done(err);
    });
  }
}
