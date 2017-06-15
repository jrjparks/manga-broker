/// <reference types="mocha"/>
import { ProviderCore } from "../src/provider";

describe("ProviderCore Tests", () => {
  const providercore = new ProviderCore();
  it("should clearCache", (done) => {
    providercore.clearCache();
    done();
  });
});
