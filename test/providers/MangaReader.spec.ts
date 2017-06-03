/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import _ = require("lodash");
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models";
import { MangaReader } from "../../src/providers/MangaReader";
import * as utils from "../utils";

describe("MangaReader Tests", () => {
  const cloudkicker: CloudKicker = new CloudKicker();
  const mangareader = new MangaReader(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  it("should return is", (done) => {
    expect(mangareader.is).to.be.equal("MangaReader");
    done();
  });

  utils.providerBadSourceHostTests(mangareader);

  const generateTests = (local: boolean = true) => {
    it("should get cache", () => {
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaReader/alphabetical.html") } });
      }
      return mangareader["getSearchCache"]()
        .then((cache) => {
          expect(cache.size).to.be.above(0);

          const cacheResult = cache.bestMatch("OnePunch-Man (ONE)");
          expect(cacheResult).to.be.ok;
          expect(cacheResult.score).to.be.equal(1);
          const cacheResultValue: ISource = cacheResult.value as ISource;
          expect(cacheResultValue).to.be.ok;
          expect(cacheResultValue.name).to.be.ok;
          expect(cacheResultValue.name).to.be.equal("OnePunch-Man (ONE)");
          expect(cacheResultValue.source).to.be.ok;
          expect(cacheResultValue.source.href).to.be.equal("http://www.mangareader.net/onepunch-man-one");
        });
    });

    it("should return search result for 'Onepunch-Man'", () => {
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaReader/alphabetical.html") } });
      }
      return mangareader.search("Onepunch-Man")
        .then(({results}) => {
          const result = results[0];
          expect(result.name).to.be.ok;
          expect(result.source).to.be.ok;
          expect(result.name).to.be.equal("Onepunch-Man");
          expect(result.source.href).to.be.equal("http://www.mangareader.net/onepunch-man");
        });
    });

    it("should fail search 'Knights & Magic'", function() {
      this.timeout(5000);
      this.slow(2000);
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaReader/alphabetical.html") } });
      }
      return mangareader.search("Knights & Magic")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.contain("Title not found.");
        });
    });

    it("should fail to return details", () => {
      const source: ISource = {
        name: "Test Source",
        source: new URL("http://www.mangareader.net/onepunch-man"),
      };
      return mangareader.details(source)
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("This function is not supported by this provider.");
        });
    });

    // it("should return details for 'Onepunch-Man'", () => {
    //   if (local) {
    //     sandbox.stub(cloudkicker, "get")
    //       .resolves({ response: { body: utils.getFixture("MangaReader/onepunch-man.html") } });
    //   }
    //   const source: ISource = {
    //     name: "Onepunch-Man",
    //     source: new URL("http://www.mangareader.net/onepunch-man"),
    //   };
    //   return mangareader.details(source)
    //     .then((details) => {
    //       expect(details).to.be.ok;
    //     });
    // });

    it("should return chapters for 'Onepunch-Man'", () => {
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaReader/onepunch-man.html") } });
      }
      const source: ISource = {
        name: "Onepunch-Man",
        source: new URL("http://www.mangareader.net/onepunch-man"),
      };
      return mangareader.chapters(source)
        .then((chapters) => {
          expect(chapters).to.be.ok;
          expect(chapters).to.be.length.above(0);
        });
    });

    it("should return pages for 'Onepunch-Man' 'Chapter 1'", () => {
      if (local) {
        const getStub = sandbox.stub(cloudkicker, "get");
        _.range(1, 20, 2).forEach((pageNumber, index) => {
          getStub.onCall(index)
            .resolves({ response: { body: utils.getFixture(`MangaReader/onepunch-man-1/${pageNumber}.html`) } });
        });
      }
      const source: ISource = {
        name: "Onepunch-Man",
        source: new URL("http://www.mangareader.net/onepunch-man/1/1"),
      };
      return mangareader.pages(source)
        .then((pages) => {
          expect(pages).to.be.ok;
          expect(pages).to.be.length.above(0);
          expect(pages).to.be.lengthOf(19);

          // Page 1 & 2
          expect(pages[0].name).to.be.equal("onepunch-man-3798615.jpg");
          expect(pages[1].name).to.be.equal("onepunch-man-3798617.jpg");

          // Page 8 & 9
          expect(pages[7].name).to.be.equal("onepunch-man-3798629.jpg");
          expect(pages[8].name).to.be.equal("onepunch-man-3798631.jpg");

          // Page 19
          expect(pages[18].name).to.be.equal("onepunch-man-3798651.jpg");
        });
    });
  };

  describe("Local File Tests", () => {
    before(() => {
      cloudkicker.clearCookieJar();
      mangareader.clearCache();
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
        mangareader.clearCache();
      });
      generateTests(false);
    }
  });

});
