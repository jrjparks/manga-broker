/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as request from "request";
import * as sinon from "sinon";
import { URL } from "url";
import {
  Genre,
} from "../../src/models";
import {
  MangaTraders,
} from "../../src/providers/MangaTraders";
import * as utils from "../utils";

describe("MangaTraders Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const provider = new MangaTraders(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  const username = process.env["MANGATRADERS-TEST-USER"] || "testuser";
  const password = process.env["MANGATRADERS-TEST-PASS"] || "testuser";
  const authResponse = {
    response: {
      body: utils.getFixture("MangaTraders/index.html").toString(),
      statusCode: 200,
    },
  };
  // const noauthResponse = { response: { body: utils.getFixture("MangaTraders/index.html") } };
  const handleAuth = (get: sinon.SinonStub, post: sinon.SinonStub) => {
    get.withArgs(sinon.match({ href: provider.baseURL.href })).resolves(authResponse);
    post.withArgs(sinon.match({
      href: new URL("/auth/process.login.php", provider.baseURL).href,
    })).resolves(authResponse);
    [ // Set cookies
      "UserSession=645bfe6d81fb60813f5b6dd110d55547",
    ].map(request.cookie).forEach((cookie: request.Cookie) =>
      cloudkicker.cookieJar.setCookie(cookie, provider.baseURL));
  };

  beforeEach("set-up", () => {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();
  });
  afterEach("tear-down", () => {
    provider.deauthenticate();
    cloudkicker.clearCookieJar();
    sandbox.restore();
    clock.restore();
  });

  it("should return is", (done) => {
    expect(provider.is).to.be.equal("MangaTraders");
    done();
  });

  utils.providerBadSourceHostTests(provider);
  utils.providerNotAuthTests(provider, provider.baseURL.href);

  const generateTests = (local: boolean = true) => {
    [{
      fixture: "MangaTraders/search_onepunch_man.html",
      genres: [Genre.Action],
      href: "https://mangatraders.biz/search/?keyword=onepunch-man",
      results: [{
        name: "Onepunch-Man",
        source: new URL("/series/OnepunchMan", provider.baseURL),
      }, {
          name: "Onepunch-Man (ONE)",
          source: new URL("/series/Onepunchmanone", provider.baseURL),
        }],
      title: "OnePunch-Man",
    }].forEach(({fixture, genres, results, title}) => {
      results.forEach((result) => {
        it(`should find ${result.name}`, () => {
          if (local) {
            const get = sandbox.stub(cloudkicker, "get");
            const post = sandbox.stub(cloudkicker, "post");
            handleAuth(get, post);
            post.resolves({ response: { body: utils.getFixture(fixture) } });
          }
          return provider.authenticate(username, password)
            .then(() => {
              return provider.find(result.name)
                .then((findResult) => {
                  expect(findResult).to.be.ok;
                  expect(findResult.name).to.be.equal(result.name);
                  expect(findResult.source).to.be.deep.equal(result.source);
                });
            });
        });
      });

      it(`should search for ${title}`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          post.resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return provider.authenticate(username, password)
          .then(() => {
            return provider.search(title, {
              genres: (genres),
            }).then((searchResults) => {
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
      });

      results.forEach((result) => {
        it(`should find ${result.name} from cache`, () => {
          if (local) {
            const get = sandbox.stub(cloudkicker, "get");
            const post = sandbox.stub(cloudkicker, "post");
            handleAuth(get, post);
            post.rejects(new Error("This should have hit the local cache."));
          }
          return provider.authenticate(username, password)
            .then(() => {
              return provider.find(result.name)
                .then((findResult) => {
                  expect(findResult).to.be.ok;
                  expect(findResult.name).to.be.equal(result.name);
                  expect(findResult.source).to.be.deep.equal(result.source);
                });
            });
        });
      });
    });

    [{
      fixture: "MangaTraders/OnepunchMan.html",
      genres: [
        Genre.Action, Genre.Comedy, Genre.Seinen, Genre.Supernatural,
      ],
      source: {
        name: "Onepunch-Man",
        source: new URL("/series/OnepunchMan", provider.baseURL),
      },
    }].forEach(({fixture, genres, source}) => {
      it(`should get details for ${source.name}`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return provider.authenticate(username, password)
          .then(() => {
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
