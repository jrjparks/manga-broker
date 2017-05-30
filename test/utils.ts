import fs = require("fs");
export const CI = process.env.CI;

export function getFixture(path: string) {
  return fs.readFileSync(`${__dirname}/fixtures/${path}`);
}

export function unexpectedPromise(result: any) {
  throw new Error(`Promise was unexpectedly fulfilled. Result: ${JSON.stringify(result)}`);
}
