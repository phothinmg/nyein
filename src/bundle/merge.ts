import fs from "node:fs/promises";

const $2wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
