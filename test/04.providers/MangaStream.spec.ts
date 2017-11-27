/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import {
  ProviderErrors,
} from "../../src/providers/errors";
import {
  MangaStream,
} from "../../src/providers/MangaStream";
import * as utils from "../utils";

describe("MangaStream Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const provider = new MangaStream(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  beforeEach("set-up", () => {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();
  });
  afterEach("tear-down", () => {
    sandbox.restore();
    clock.restore();
  });

  it("should return is", (done) => {
    expect(provider.is).to.be.equal("MangaStream");
    done();
  });

  utils.providerBadSourceHostTests(provider);
  // utils.providerNotAuthTests(provider, "https://www.novelupdates.com/#bad");

  const generateTests = (local: boolean = true) => {
    [{
      fixture: "MangaStream/manga.html",
      href: "https://readms.net/manga",
      results: [{
        name: "One-Punch Man",
        source: new URL("/manga/onepunch_man", provider.baseURL),
      }],
      title: "One-Punch Man",
    }].forEach(({fixture, href, results, title}) => {
      results.forEach((result) => {
        it(`should find ${result.name}`, () => {
          if (local) {
            const get = sandbox.stub(cloudkicker, "get");
            // const post = sandbox.stub(cloudkicker, "post");
            get.resolves({ response: { body: utils.getFixture(fixture) } });
          }
          return provider.find(result.name)
            .then((findResult) => {
              expect(findResult).to.be.ok;
              expect(findResult.name).to.be.equal(result.name);
              expect(findResult.source).to.be.deep.equal(result.source);
            });
        });
      });

      it(`should search for ${title}`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          // const post = sandbox.stub(cloudkicker, "post");
          get.withArgs(sinon.match({ href: (href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return provider.search(title).then((searchResults) => {
          expect(searchResults).to.be.ok;
          expect(searchResults.hasNextPage).to.be.false;
          expect(searchResults.hasPreviousPage).to.be.false;
          expect(searchResults.options).to.be.ok;
          expect(searchResults.page).to.be.equal(1);

          expect(searchResults.results).to.be.ok;
          expect(searchResults.results).to.have.lengthOf.at.least(results.length);
          for (const result of results) {
            expect(searchResults.results).to.deep.include(result);
          }
        });
      });

      results.forEach((result) => {
        it(`should find ${result.name} from cache`, () => {
          if (local) {
            const get = sandbox.stub(cloudkicker, "get");
            // const post = sandbox.stub(cloudkicker, "post");
            get.rejects(new Error("This should have hit the local cache."));
          }
          return provider.find(result.name)
            .then((findResult) => {
              expect(findResult).to.be.ok;
              expect(findResult.name).to.be.equal(result.name);
              expect(findResult.source).to.be.deep.equal(result.source);
            });
        });
      });

      results.forEach((result) => {
        it(`should fail details for ${result.name}`, () => {
          return provider.details(result)
            .then(utils.unexpectedPromise)
            .catch((error) => {
              expect(error).to.be.ok;
              expect(error.name).to.be.contain(ProviderErrors.FUNCTION_NOT_SUPPORTED.name);
              expect(error.message).to.be.contain(ProviderErrors.FUNCTION_NOT_SUPPORTED.message);
            });
        });
      });

    });

    [{
      fixture: "MangaStream/onepunch_man.html",
      source: {
        name: "One-Punch Man",
        source: new URL("/manga/onepunch_man", provider.baseURL),
      },
    }].forEach(({fixture, source}) => {
        it(`should return chapters for '${source.name}'`, () => {
          if (local) {
            sandbox.stub(cloudkicker, "get")
              .withArgs(sinon.match({ href: (source.source.href) }))
              .resolves({ response: { body: utils.getFixture(fixture) } });
          }
          return provider.chapters(source)
            .then((chapters) => {
              expect(chapters).to.be.ok;
              expect(chapters).to.be.length.above(0);
              const chapter = chapters[0];
              expect(chapter.name).to.be.ok;
              expect(chapter.source).to.be.ok;
              expect(chapter.chapter).to.be.ok;
              expect(chapter.chapter).to.be.above(0);
            });
        });

    });

    [{
      fixture: "MangaStream/onepunch_man/083.html",
      name: "One-Punch Man",
      pageCount: 57,
      source: {
        chapter: 83,
        name: "The Hard Road Uphill",
        source: new URL("/r/onepunch_man/083/4685/1", provider.baseURL),
      },
    }].forEach(({fixture, name, pageCount, source}) => {
        it(`should return pages for '${source.name}' from '${name}'`, () => {
          if (local) {
            sandbox.stub(cloudkicker, "get")
              .withArgs(sinon.match({ href: (source.source.href) }))
              .resolves({ response: { body: utils.getFixture(fixture) } });
          }
          return provider.pages(source)
            .then((pages) => {
              expect(pages).to.be.ok;
              expect(pages).to.be.length(pageCount);
              const page = pages[0];
              expect(page.name).to.be.ok;
              expect(page.source).to.be.ok;
            });
        });

    });
  };

  describe("Local File Tests", () => generateTests(true));

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
