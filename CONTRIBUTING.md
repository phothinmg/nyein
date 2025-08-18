# Contributing to Nyein

Thank you for your interest in contributing! Nyein is a TypeScript CLI and API for bundling, generating dts files, and building hybrid (CommonJS/ESM) node packages. Contributions are welcome for bug fixes, features, documentation, and code quality improvements.

## Project Structure

- **src/**: Main source code
  - `bundle.ts`, `bundle_dts.ts`: Bundling logic
  - `compile_npm.ts`: NPM package build logic
  - `config.ts`: Project config loader
  - `check/`: Type and duplicate declaration checks
  - `opt/`: Helpers, file operations, dependency analysis
- **public/**: Assets
- **dist/**: Built CLI output

## How to Contribute

1. **Fork and Clone**
   - Fork the repo and clone your fork.
2. **Install Dependencies**
   - Run `npm install` in the project root.
3. **Code Style**
   - Use TypeScript and follow the existing code style.
   - Format code with `npm run format` (Biome).
   - Lint with `npm run lint`.
4. **Making Changes**
   - Add new features in the `src/` folder.
   - For CLI commands, update `src/nyein.ts` and related modules.
   - For checks, add to `src/check/`.
   - For helpers, add to `src/opt/`.
   - Update or add tests if relevant.
5. **Build and Test**
   - Build: `npm run build`
   - Check: `npm run check`
   - Run CLI locally: `npx tsx src/nyein.ts <command>`
6. **Documentation**
   - Update `readme.md` for user-facing changes.
   - Document new CLI options and config fields.
7. **Commit and PR**
   - Commit with clear messages.
   - Open a pull request describing your changes.

## Adding a CLI Command
- Edit `src/nyein.ts` to add a new command using Commander.
- Implement logic in a new or existing module in `src/`.

## Adding a Check
- Add new check logic in `src/check/`.
- Export it in `src/check/index.ts`.
- Integrate with bundle/build logic if needed.

## Code Formatting & Linting
- Format: `npm run format`
- Lint: `npm run lint`
- Check: `npm run check`

## Reporting Issues
- Use [GitHub Issues](https://github.com/phothinmg/nyein/issues) for bugs, feature requests, and questions.

## License
Nyein is licensed under Apache-2.0. See `LICENSE` for details.

---

Happy coding!
