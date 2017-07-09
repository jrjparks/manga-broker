/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models/source";
import {
  EasyGoingScans,
} from "../../src/providers/EasyGoingScans";
import * as utils from "../utils";

describe("EasyGoingScans Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const egscans = new EasyGoingScans(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  it("should return is", (done) => {
    expect(egscans.is).to.be.equal("EasyGoingScans");
    done();
  });

  utils.providerBadSourceHostTests(egscans);

  const generateTests = (local: boolean = true) => {
    it("should get cache", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "http://read.egscans.com/" }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      }
      return egscans["getSearchCache"]()
        .then((cache) => {
          expect(cache.size).to.be.above(0);

          const cacheResult = cache.bestMatch("Knights & Magic");
          expect(cacheResult).to.be.ok;
          expect(cacheResult.score).to.be.equal(1);
          const cacheResultValue: ISource = cacheResult.value as ISource;
          expect(cacheResultValue).to.be.ok;
          expect(cacheResultValue.name).to.be.ok;
          expect(cacheResultValue.name).to.be.equal("Knights and Magic");
          expect(cacheResultValue.source).to.be.ok;
          expect(cacheResultValue.source.href).to.be.equal("http://read.egscans.com/Knights_and_Magic");
        });
    });

    it("should fail for 'One Punch-Man'", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "http://read.egscans.com/" }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      }
      return egscans.find("One Punch-Man")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.contain("Title not found.");
        });
    });

    it("should return search result for 'Knights & Magic'", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "http://read.egscans.com/" }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      }
      return egscans.search("Knights & Magic")
        .then(({results}) => {
          const result = results[0];
          expect(result.name).to.be.ok;
          expect(result.name).to.be.equal("Knights and Magic");
          expect(result.source).to.be.ok;
          expect(result.source.href).to.be.equal("http://read.egscans.com/Knights_and_Magic");
        });
    });

    it("should return find result for 'Knights & Magic'", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "http://read.egscans.com/" }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      }
      return egscans.find("Knights & Magic")
        .then((result) => {
          expect(result.name).to.be.ok;
          expect(result.name).to.be.equal("Knights and Magic");
          expect(result.source).to.be.ok;
          expect(result.source.href).to.be.equal("http://read.egscans.com/Knights_and_Magic");
        });
    });

    it("should fail to return details", () => {
      const source: ISource = {
        name: "Test Source",
        source: new URL("http://read.egscans.com/"),
      };
      return egscans.details(source)
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("This function is not supported by this provider.");
        });
    });

    it("should return chapters for 'Knights & Magic'", () => {
      const source: ISource = {
        name: "Knights and Magic",
        source: new URL("http://read.egscans.com/Knights_and_Magic/"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/Knights_and_Magic.html") } });
      }
      return egscans.chapters(source)
        .then((chapters) => {
          expect(chapters).to.be.ok;
          expect(chapters).to.have.length.above(0);
          const chapter = chapters[0];
          expect(chapter).to.be.ok;
          expect(chapter.chapter).to.be.ok;
          expect(chapter.chapter).to.be.equal(1);
        });
    });

    it("should return pages for 'Knights & Magic' 'Chapter 001'", () => {
      const source: ISource = {
        name: "Knights and Magic",
        source: new URL("http://read.egscans.com/Knights_and_Magic/Chapter_001/?display=webtoon"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("EasyGoingScans/Knights_and_Magic.html") } });
      }
      return egscans.pages(source)
        .then((pages) => {
          expect(pages).to.be.ok;
          expect(pages).to.have.length.above(0);
          const page = pages[0];
          expect(page).to.be.ok;
          expect(page.name).to.be.ok;
          expect(page.source).to.be.ok;
          expect(page.source.href).to.be.ok;
        });
    });
  };

  describe("Local File Tests", () => {
    before(() => {
      cloudkicker.clearCookieJar();
      egscans.clearCache();
    });
    beforeEach("set-up", () => {
      sandbox = sinon.sandbox.create();
      clock = sinon.useFakeTimers();
    });
    afterEach("tear-down", () => {
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
        egscans.clearCache();
      });
      generateTests(false);
    }
  });
});
