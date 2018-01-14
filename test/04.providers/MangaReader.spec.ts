/* tslint:disable:no-string-literal max-line-length */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import _ = require("lodash");
import * as sinon from "sinon";
import { URL } from "url";

import { ISource } from "../../src/models/source";
import {
  MangaReader,
} from "../../src/providers/MangaReader";
import * as utils from "../utils";

describe("MangaReader Tests", function() {
  this.retries(2);
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

    [{
      fixture: "MangaReader/search_one_punch_man.html",
      href: "http://www.mangareader.net/search/?w=One+Punch-Man&rd=0&status=0&order=0&genre=0000000000000000000000000000000000000&p=0",
      results: [{
        name: "Onepunch-Man",
        source: new URL("http://www.mangareader.net/onepunch-man"),
      }, {
        name: "OnePunch-Man (ONE)",
        source: new URL("http://www.mangareader.net/onepunch-man-one"),
      }],
      term: "One Punch-Man",
    },
  ].forEach(({term, href, fixture, results}) => {
      it(`should return search result for '${term}'`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          // const post = sandbox.stub(cloudkicker, "post");
          get.withArgs(sinon.match({ href: (href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return mangareader.search(term)
          .then((searchResults) => {
            expect(searchResults).to.be.ok;
            expect(searchResults.hasNextPage).to.be.false;
            expect(searchResults.hasPreviousPage).to.be.false;
            expect(searchResults.options).to.be.ok;
            expect(searchResults.page).to.be.equal(1);

            expect(searchResults.results).to.be.ok;
            expect(searchResults.results).to.have.lengthOf(results.length);
            for (const result of results) {
              expect(searchResults.results).to.deep.include(result);
            }
          });
      });
    });

    [{
      fixture: "MangaReader/onepunch-man.html",
      href: "http://www.mangareader.net/onepunch-man",
      name: "Onepunch-Man",
    }, {
        fixture: "MangaReader/kapon.html",
        href: "http://www.mangareader.net/kapon-_",
        name: "Kapon (>_<)!",
      },
    ].forEach(({name, href, fixture}) => {
      const source: ISource = {
        name: (name),
        source: new URL(href),
      };

      it(`should return find result for '${name}'`, () => {
        if (local) {
          sandbox.stub(cloudkicker, "get")
            .resolves({ response: { body: utils.getFixture("MangaReader/alphabetical.html") } });
        }
        return mangareader.find(name)
          .then((result) => {
            expect(result.name).to.be.ok;
            expect(result.source).to.be.ok;
            expect(result.name).to.be.equal(name);
            expect(result.source.href).to.be.equal(href);
          });
      });

      it(`should return details for '${name}'`, () => {
        return mangareader.details(source)
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
        return mangareader.chapters(source)
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
          get.withArgs(sinon.match({ href: `http://www.mangareader.net/onepunch-man/1/${pageNumber}` }))
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
