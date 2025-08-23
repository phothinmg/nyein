#!/usr/bin/env node
import { Command } from "commander";
//import { bundle, bundleDts } from "./index.js";
import { version } from "./banner_text.js";
const program = new Command();

program
  .name("nyein")
  .description(
    "CLI for typescript bundle,generate bundle dts and node package builder."
  )
  .version(version);

// program
// 	.command("npm")
// 	.description("Hybrid (CommonJS/ESM) TypeScript node package builder.")
// 	.action(async () => {
// 		await compileNPM();
// 	});

// program
// 	.command("bundle")
// 	.description("Bundle typescript files into single typescript file.")
// 	.argument("<entry>", "Path to entry file")
// 	.option("-o, --outdir <outDir>", "Directory for bundled output")
// 	.option(
// 		"--noCheck [check]",
// 		"Types check and check for duplicate declarations",
// 	)
// 	.option(
// 		"--notExit [exit]",
// 		"If `options.check` true , when error exit process or not",
// 		true,
// 	)
// 	.option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
// 	.action(async (entry, options) => {
// 		const _check = !options.noCheck;
// 		const _exit = !options.notExit;
// 		await bundle({
// 			entry: entry,
// 			outDir: options.outdir,
// 			check: _check,
// 			exit: _exit,
// 			compileOptsOrPath: options.config,
// 			write: true,
// 		});
// 	});

// program
// 	.command("dts")
// 	.description("Generate bundle dts file from entry")
// 	.argument("<entry>", "Path to entry file")
// 	.option("-o, --outdir <outDir>", "Directory for generated dts file")
// 	.option(
// 		"--noCheck [check]",
// 		"Types check and check for duplicate declarations",
// 	)
// 	.option(
// 		"--notExit [exit]",
// 		"If `options.check` true , when error exit process or not",
// 		true,
// 	)
// 	.option("-p, --config [tsconfig]", "Custom tsconfig path.", undefined)
// 	.action(async (entry, options) => {
// 		const _check = !options.noCheck;
// 		const _exit = !options.notExit;
// 		await bundleDts({
// 			entry: entry,
// 			outDir: options.outdir,
// 			check: _check,
// 			exit: _exit,
// 			compileOptsOrPath: options.config,
// 		});
// 	});

program.parse();
