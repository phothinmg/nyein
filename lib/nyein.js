#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { bundle, bundleDts } from "./index.js";
const require = createRequire(import.meta.url);
const _package = require("../package.json");
const program = new Command();

program
  .name("nyein")
  .description("CLI for typescript bundle and generate bundle dts")
  .version(_package.version);

program
  .command("bundle")
  .description("Bundle typescript files into single typescript file.")
  .argument("<entry>", "Path to entry file")
  .option("-o, --outdir <outDir>", "Directory for bundled output")
  .option(
    "--noCheck [check]",
    "Types check and check for duplicate declarations"
  )
  .option(
    "--notExit [exit]",
    "If `options.check` true , when error exit process or not",
    true
  )
  .option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
  .action(async (entry, options) => {
    const _check = options.noCheck ? false : true;
    const _exit = options.notExit ? false : true;
    await bundle({
      entry: entry,
      outDir: options.outdir,
      check: _check,
      exit: _exit,
      compileOptsOrPath: options.config,
      write: true,
    });
  });

program
  .command("dts")
  .description("Generate bundle dts file from entry")
  .argument("<entry>", "Path to entry file")
  .option("-o, --outdir <outDir>", "Directory for generated dts file")
  .option(
    "--noCheck [check]",
    "Types check and check for duplicate declarations"
  )
  .option(
    "--notExit [exit]",
    "If `options.check` true , when error exit process or not",
    true
  )
  .option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
  .action(async (entry, options) => {
    const _check = options.noCheck ? false : true;
    const _exit = options.notExit ? false : true;
    await bundleDts({
      entry: entry,
      outDir: options.outdir,
      check: _check,
      exit: _exit,
      compileOptsOrPath: options.config,
    });
  });

program.parse();
