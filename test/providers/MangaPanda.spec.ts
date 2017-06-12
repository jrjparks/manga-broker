/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import _ = require("lodash");
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models/source";
import { MangaPanda } from "../../src/providers/MangaPanda";
import * as utils from "../utils";

describe("MangaPanda Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const mangapanda = new MangaPanda(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  it("should return is", (done) => {
    expect(mangapanda.is).to.be.equal("MangaPanda");
    done();
  });

  utils.providerBadSourceHostTests(mangapanda);

  const generateTests = (local: boolean = true) => {
    it("should get cache", () => {
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaPanda/alphabetical.html") } });
      }
      return mangapanda["getSearchCache"]()
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
          expect(cacheResultValue.source.href).to.be.equal("http://www.mangapanda.com/onepunch-man-one");
        });
    });

    it("should fail search 'Knights & Magic'", function() {
      this.timeout(5000);
      this.slow(2000);
      if (local) {
        sandbox.stub(cloudkicker, "get")
          .resolves({ response: { body: utils.getFixture("MangaPanda/alphabetical.html") } });
      }
      return mangapanda.search("Knights & Magic")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.contain("Title not found.");
        });
    });

    it("should fail to return details", () => {
      const source: ISource = {
        name: "Test Source",
        source: new URL("http://www.mangapanda.com/onepunch-man"),
      };
      return mangapanda.details(source)
        .then((details) => {
          expect(details).to.be.ok;
        });
    });

    [{
      fixture: "MangaReader/onepunch-man.html",
      href: "http://www.mangapanda.com/onepunch-man",
      name: "Onepunch-Man",
    }, {
        fixture: "MangaReader/kapon.html",
        href: "http://www.mangapanda.com/kapon-_",
        name: "Kapon (>_<)!",
      },
    ].forEach(({name, href, fixture}) => {
      const source: ISource = {
        name: (name),
        source: new URL(href),
      };

      it(`should return search result for '${name}'`, () => {
        if (local) {
          sandbox.stub(cloudkicker, "get")
            .resolves({ response: { body: utils.getFixture("MangaReader/alphabetical.html") } });
        }
        return mangapanda.search(name)
          .then(({results}) => {
            const result = results[0];
            expect(result.name).to.be.ok;
            expect(result.source).to.be.ok;
            expect(result.name).to.be.equal(name);
            expect(result.source.href).to.be.equal(href);
          });
      });

      it(`should return details for '${name}'`, () => {
        return mangapanda.details(source)
          .then((details) => {
            expect(details).to.be.ok;
            expect(details.name).to.be.equal(name);
          });
      });

      it(`should return chapters for '${name}'`, () => {
        if (local) {
          sandbox.stub(cloudkicker, "get")
            .withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return mangapanda.chapters(source)
          .then((chapters) => {
            expect(chapters).to.be.ok;
            expect(chapters).to.be.length.above(0);
            const chapter = chapters[0];
            expect(chapter.name).to.be.ok;
            expect(chapter.source).to.be.ok;
            expect(chapter.chapter).to.be.ok;
            expect(chapter.chapter).to.be.equal(1);
          });
      });
    });

    it("should return pages for 'Onepunch-Man' 'Chapter 1'", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        _.range(1, 20 + 1, 2).forEach((pageNumber) => {
          get.withArgs(sinon.match({ href: `http://www.mangapanda.com/onepunch-man/1/${pageNumber}` }))
            .resolves({ response: { body: utils.getFixture(`MangaPanda/onepunch-man-1/${pageNumber}.html`) } });
        });
      }
      const source: ISource = {
        name: "Onepunch-Man",
        source: new URL("http://www.mangapanda.com/onepunch-man/1/1"),
      };
      return mangapanda.pages(source)
        .then((pages) => {
          expect(pages).to.be.ok;
          expect(pages).to.be.length.above(0);
          expect(pages).to.be.lengthOf(19);

          // Page 1 & 2
          expect(pages[0].name).to.be.equal("onepunch-man-3796543.jpg");
          expect(pages[1].name).to.be.equal("onepunch-man-3796545.jpg");

          // Page 8 & 9
          expect(pages[7].name).to.be.equal("onepunch-man-3796557.jpg");
          expect(pages[8].name).to.be.equal("onepunch-man-3796559.jpg");

          // Page 19
          expect(pages[18].name).to.be.equal("onepunch-man-3796579.jpg");
        });
    });
  };

  describe("Local File Tests", () => {
    before(() => {
      cloudkicker.clearCookieJar();
      mangapanda.clearCache();
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
        mangapanda.clearCache();
      });
      generateTests(false);
    }
  });

});
