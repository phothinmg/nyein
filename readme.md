<div align="center">
<img alt="nyein-logo" src="https://cdn.jsdelivr.net/gh/phothinmg/nyein@main/public/nyein.png" width="200px" height="200px">
</div>

**_Still under development_**.

## About

The utilities for create small size typescript node package and publish,focus on my personal requirements.

## Install

```bash
npm i -D nyein
```


## Use

### CLI

```text

Usage: nyein [options] [command]

CLI for typescript bundle,generate bundle dts and node package builder.

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  npm                       Hybrid (CommonJS/ESM) TypeScript node package builder.
  bundle [options] <entry>  Bundle typescript files into single typescript file.
  dts [options] <entry>     Generate bundle dts file from entry
  help [command]            display help for command

```

### 1. Bundle typescript files to a single file.

Simply bundle TypeScript files into a single file while generating a dependency tree using the [madge][madge-github] API. All imports and exports, except for exports in the entry file, are removed. Imports from npm packages and Node.js modules appear at the top of the bundled output file. Type checking and duplicate declaration detection are performed during the bundling process.

_*`jsx` and `commonjs` are currently unsupported now.*_

#### Example use

```bash
npx nyein bundle path/to/entry.ts -o path/to/output/dir
```

Optional options:

- `--noCheck` : Skip types checking and duplicate declaration detection.

- `-p` OR `--config` followed by the path/to/custom/tsconfig file: The package flavor custom tsconfig file, if not provided, it will look for `tsconfig.json` at the root of the project. `noEmit = true` and `strict = true` will overwrite for types checking and duplicate declaration detection.

### 2. Generate bundled dts file.

Generate a bundled dts file from a TypeScript file and its dependencies. 

#### Example use

```bash
npx nyein dts path/to/entry.ts -o path/to/output/directory
```

`declaration: true` and `emitDeclarationOnly: true` will overwrite on compiler options.

### 3. Build typescript package and handle dual output both ESM/Commonjs

Build typescript node package  and dual output with single build.

<!-- Links Ref -->

[madge-github]: https://github.com/pahen/madge
