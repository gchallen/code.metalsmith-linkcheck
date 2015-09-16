# metalsmith-linkcheck

This is a plugin for [Metalsmith][] that checks links.

[metalsmith]: http://metalsmith.io

## Installation

This module is released via npm, install the latest released version with

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
of your HTML pages have been generated.

## Options

metalsmith-linkcheck does not require any options, but the following options
are available:

- `src` is a globbing pattern that specifies which files to linkcheck
- `target` is an imagemagick format specifier
- `extension` the file extension to use for the conversion target (starting with `.`). Set to `"." + target` if not given explicitly.
- `remove` if set to `true`, don't include the source-file in the build directory.
- `resize` set to `{width: XXX, height: YYY}` to resize the image; the name will reflect the size (`name_XXX_YYY.ext`) if `nameFormat` is not given.
- `nameFormat` give the format for the names of the linkchecked files, the following placeholders are available
  - `%b` the basename of the source file, e.g. given `source.png`, the value will be `source`
  - `%e` the extension of the target format, including the dot
  - `%x` the width of the resulting image
  - `%y` the height if the resulting image
