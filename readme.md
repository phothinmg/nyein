<div align="center">
<img alt="nyein-logo" src="https://cdn.jsdelivr.net/gh/phothinmg/nyein@main/nyein.png" width="200px" height="200px">
</div>

**_Still under development_**.

## Overview

The utilities for create small size typescript node package and publish,focus on my personal requirements.

### 1. Bundle typescript files to single file.

Simply bundle TypeScript files into a single file while generating a dependency tree using the [madge][madge-github] API. All imports and exports, except for exports in the entry file, are removed. Imports from npm packages and Node.js modules appear at the top of the bundled output file. Type checking and duplicate declaration detection are performed during the bundling process.

> NOTES
> `jsx` and `commonjs` are currently unsupported now.

#### Use with cli.

```bash
npx nyein bundle path/to/entry.ts -o path/to/output/dir
```

Optional options:

- `--noCheck` : Skip types checking and duplicate declaration detection.

- `-p` OR `--config` followed by the path/to/custom/tsconfig file: The package flavor custom tsconfig file, if not provided, it will look for `tsconfig.json` at the root of the project. `noEmit = true` and `strict = true` will overwrite for types checking and duplicate declaration detection.

### 2. Generate bundled dts file.

Generate a bundled dts file from a TypeScript file and its dependencies. When building TypeScript node packages with popular bundlers like `webpack`, `rollup`, or `esbuild`, generate a bundled dts file from the same entry file of the bundlers.

#### Use with cli

```bash
npx nyein dts path/to/entry.ts -o path/to/output/directory
```

### 3. Build typescript package handle dual output both ESM/Commonjs



[madge-github]: https://github.com/pahen/madge
