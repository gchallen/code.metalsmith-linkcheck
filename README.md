# metalsmith-linkcheck

This is a plugin for [Metalsmith][] that checks links.

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
requires network access** (duh) and, if the `optimizeInternal` option is not
set, a running local webserver to test internal links.

## Options

metalsmith-linkcheck does not require any options, but the following options
are available:

- `optimizeInternal`: if set, metalsmith-linkcheck will look for internal
  links in the metalsmith output files, rather than by contacting a local
  webserver. If disabled, `internalHost` must be set. **Defaults to true.**
- `failMissing`: if set the metalsmith build process will halt if links are
  missing. **Defaults to false.**
