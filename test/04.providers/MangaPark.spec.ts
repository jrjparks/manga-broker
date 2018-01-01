/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import {
  Genre,
} from "../../src/models";
import {
  MangaPark,
} from "../../src/providers/MangaPark";
import * as utils from "../utils";

describe("MangaPark Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const provider = new MangaPark(cloudkicker);
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
    expect(provider.is).to.be.equal("MangaPark");
    done();
  });

  utils.providerBadSourceHostTests(provider);
  // utils.providerNotAuthTests(provider, "https://mangapark.me/#bad");

  const generateTests = (local: boolean = true) => {
    [{
      fixture: "MangaPark/search_onepunch_man.html",
      genres: [Genre.Action],
      href: "https://mangapark.me/search?q={title}&page=1&genres=action",
      results: [{
        name: "Onepunch-Man",
        source: new URL("/manga/onepunch-man-2", provider.baseURL),
      }, {
        name: "Onepunch-Man (ONE)",
        source: new URL("/manga/onepunch-man-one-1", provider.baseURL),
      }],
      title: "Onepunch-Man",
    }].forEach(({ fixture, genres, href, results, title }) => {
      href = href.replace("{title}", title);
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
        return provider.search(title, {
          genres: (genres),
        })
          .then((searchResults) => {
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
    });

    [{
      fixture: "MangaPark/onepunch-man.html",
      genres: [
        Genre.Action, Genre.Comedy, Genre.MartialArts, Genre.Seinen,
        Genre.Shounen, Genre.Supernatural,
      ],
      source: {
        name: "Onepunch-Man",
        source: new URL("https://mangapark.me/manga/onepunch-man"),
      },
    }].forEach(({ fixture, genres, source }) => {
      it(`should get details for ${source.name}`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          // const post = sandbox.stub(cloudkicker, "post");
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return provider.details(source)
          .then((details) => {
            expect(details).to.be.ok;
            expect(details.name).to.be.equal(source.name);
            expect(details.source).to.be.deep.equal(source.source);

            if (!details.about) { throw new Error("about is not defined"); }
            if (!details.about.genres) { throw new Error("about.genres is not defined"); }
            expect(details.about.genres).to.be.ok;
            for (const genre of genres) {
              expect(details.about.genres).to.include(genre);
            }
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
