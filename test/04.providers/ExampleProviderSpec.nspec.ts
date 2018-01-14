/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as request from "request";
import * as sinon from "sinon";
import { URL } from "url";
import {
  Genre,
  ISource,
} from "../../src/models";
import {
  isAuthentableProvider,
  MangaUpdates as ProviderCore, // Replace this with the real provider. Update 'is' test too.
} from "../../src/providers";
import * as utils from "../utils";

describe("ProviderCore Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const provider = new ProviderCore(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  it("should return is", (done) => {
    expect(provider.is).to.be.equal("ProviderCore"); // Update this.
    done();
  });

  const generateTests = (local: boolean = true) => undefined;

  describe("Local File Tests", () => {
    before(() => {
      cloudkicker.clearCookieJar();
      provider.clearCache();
    });
    beforeEach("set-up", () => {
      sandbox = sinon.sandbox.create();
      clock = sinon.useFakeTimers();
    });
    afterEach("tear-down", () => {
      if (isAuthentableProvider(provider)) {
        provider.deauthenticate();
      }
      cloudkicker.clearCookieJar();
      sandbox.restore();
      clock.restore();
    });
    generateTests(true);
  });

  describe("Remote Live Tests", function() {
    if (utils.CI) {
      it.skip("detected running on CI, skipping");
    } else {
      this.timeout(10000);
      this.slow(5000);
      this.retries(3);
      before(() => {
        cloudkicker.clearCookieJar();
        provider.clearCache();
      });
      generateTests(false);
    }
  });

});
