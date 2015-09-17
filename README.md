# metalsmith-linkcheck

This is a plugin for [Metalsmith][] that checks links&mdash;both internal and
external. (In contrast to
[metalsmith-broken-link-checker](https://github.com/davidxmoody/metalsmith-broken-link-checker),
which only checks internal links.)

[metalsmith]: http://metalsmith.io

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

For metalsmiths JavaScript API, metalsmith-linkcheck can be used like any other plugin, by attaching it to the function invocation chain on the metalscript object:

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

### Options

metalsmith-linkcheck does not require any options, but the following options
are available:

#### `failWithoutNetwork` (optional)

(default : *true*)

If set, metalsmith-linkcheck will fail if no network
  connection is available. Otherwise, it will check internal links if
  `optimizeInternal` is set. Otherwise it will do nothing.

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
  metalsmith-linkcheck caches link check information.

#### `ignoreFile` (optional)

(default: *`links_ignore.json`*)

Path relative to the metalsmith source directory to a JSON
  file containing an array of links to ignore.

#### `failFile` (optional)

(default: *`links_failed.json`*)

Path relative to the metalsmith source directory to a JSON file where link
failures are recorded.

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

