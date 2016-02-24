# metalsmith-linkcheck

This is a plugin for [Metalsmith](http://metasmith.io) that checks links&mdash;both internal and
external. (In contrast to
[metalsmith-broken-link-checker](https://github.com/davidxmoody/metalsmith-broken-link-checker),
which only checks internal links.)

## Installation

This module is released via npm, install the latest released version with:

```
npm install --save metalsmith-linkcheck
```

##  Usage

If using the CLI for Metalsmith, metalsmith-linkcheck can be used like any other plugin by including it in `metalsmith.json`:

```json
{
  "plugins": {
    "metalsmith-linkcheck"
  }
}
```

For Metalsmith's JavaScript API, metalsmith-linkcheck can be used like any other plugin, by attaching it to the function invocation chain on the metalscript object:

```js
var linkcheck = require('metalsmith-linkcheck');
require('metalsmith')(__dirname)
  .use(linkcheck())
  .build();
```

Because metalsmith-linkcheck will only check HTML pages, normally you will
want to use metalsmith-linkcheck at the end of your build pipeline when all
of your HTML pages have been generated. **Note that metalsmith-linkcheck
requires network access** (duh). In addition, relative and root-relative
local links are checked by looking for them in the metalsmith files array,
and so this may not work if you using local links to things not included in
your Metalsmith build.

## Exceptions

metalsmith-linkcheck will ignore links that have or are descendants of
elements with the class `link_exception`. For example, both of these links
will not be checked:

```html
<a href="broken.html" class="link_exception">This link will be skipped.</a>
<span class="link_exception"><a href="broken.html">So will this
one.</a></span>
```

### Options

metalsmith-linkcheck does not require any options, but the following options
are available:

#### `verbose` (optional)

(default: *false*)

If set a message will be printed if links fail. 

#### `failWithoutNetwork` (optional)

(default : *true*)

If set, metalsmith-linkcheck will fail if no network
connection is available. Otherwise, it will still check internal links before
exiting. Note in this case that external links will not be reported as
failing.

#### `failMissing` (optional)

(default: *false*)

If set the metalsmith build process will halt if links are missing.

#### `cacheChecks` (optional)

(default: *true*)

If set metalsmith-linkcheck will record when external links succeed in
`checkFile` and not repeat the check for an interval set by `recheckMinutes`.

#### `recheckMinutes` (optional)

(default : *1440* (24 hours))

Determines the length between successive link checks when `cacheChecks` is
set to true.

#### `checkFile` (optional)

(default: *`.links_checked.json`*)

Path relative to the metalsmith source directory where
metalsmith-linkcheck caches link check information. This will be removed from
the build directory.

#### `ignoreFile` (optional)

(default: *`links_ignore.json`*)

Path relative to the metalsmith source directory to a JSON
file containing an array of links to ignore. This will be removed from the
build directory.

#### `failFile` (optional)

(default: *`links_failed.json`*)

Path relative to the metalsmith source directory to a JSON file where link
failures are recorded. This will be removed from the build directory.

<!--
#### `optimizeInternal` (optional)

(default : *true*)

If set, metalsmith-linkcheck will look for internal
  links in the metalsmith output files, rather than by contacting a local
  webserver. If disabled, `internalHost` must be set.

#### `internalHost` (optional)

(default : undefined)

Internal host and port to use if not optimizing internal link checks.
-->

