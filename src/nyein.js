#!/usr/bin/env node
import { Command } from "commander";
import { bundle, bundleDts, compileNpm, version } from "./index.js";

const program = new Command();

program
  .name("nyein")
  .description(
    "CLI for typescript bundle,generate bundle dts and node package builder."
  )
  .version(version);

program
  .command("npm")
  .description("Hybrid (CommonJS/ESM) TypeScript node package builder.")
  .action(async () => {
    await compileNpm();
  });

program
  .command("bundle")
  .description("Bundle typescript files into single typescript file.")
  .argument("<entry>", "Path to entry file")
  .option("-o, --outdir <outDir>", "Directory for bundled output")
  .option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
  .action(async (entry, options) => {
    const _check = !options.noCheck;
    const _exit = !options.notExit;
    const bun = await bundle({
      entry: entry,
      outDir: options.outdir,
      customConfigPath: options.config,
    });
    await bun.write();
  });
program
  .command("dts")
  .description("Generate bundle dts file from entry")
  .argument("<entry>", "Path to entry file")
  .option("-o, --outdir <outDir>", "Directory for generated dts file")
  .option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
  .action(async (entry, options) => {
    const _check = !options.noCheck;
    const _exit = !options.notExit;
    await bundleDts({
      entry: entry,
      outDir: options.outdir,
      customConfigPath: options.config,
    });
  });

program.parse();
