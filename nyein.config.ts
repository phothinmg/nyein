import type { NyeinConfig } from "./src/index.js";

const config: NyeinConfig = {
  npm: {
    exports: {
      main: "./src/index.ts",
    },
    outDir: "./lib",
  },
};

export default config;
