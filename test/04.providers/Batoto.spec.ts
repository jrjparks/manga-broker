/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import _ = require("lodash");
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as request from "request";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models/source";
import { Batoto } from "../../src/providers/Batoto";
import * as utils from "../utils";

describe("Batoto Tests", () => {
  const cloudkicker: CloudKicker = new CloudKicker();
  const batoto = new Batoto(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  const username = process.env["BATOTO-TEST-USER"] || "testuser";
  const password = process.env["BATOTO-TEST-PASS"] || "testuser";

  const authResponse = {
    response: {
      body: utils.getFixture("Batoto/forums.auth.html").toString().replace("%USERNAME%", username),
    },
  };
  const noauthResponse = { response: { body: utils.getFixture("Batoto/forums.noauth.html") } };

  const handleAuth = (get: sinon.SinonStub, post: sinon.SinonStub) => {
    get.withArgs(sinon.match({ href: "https://bato.to/forums" })).resolves(authResponse);
    post.withArgs(sinon.match({
      href: "https://bato.to/forums/index.php?app=core&do=process&module=global&section=login",
    })).resolves(authResponse);
    [ // Set cookies
      "ipsconnect_d8874f8d538b1279c8106e636bf7afe9=1",
      "coppa=0",
      "member_id=000000",
      "pass_hash=645bfe6d81fb60813f5b6dd110d55547",
      "session_id=27bb29744fbaca423a069fdf1150e7f6",
    ].map(request.cookie).forEach((cookie: request.Cookie) =>
      cloudkicker.cookieJar.setCookie(cookie, batoto.baseURL));
  };

  beforeEach("set-up", () => {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();
  });
  afterEach("tear-down", () => {
    batoto.deauthenticate();
    cloudkicker.clearCookieJar();
    sandbox.restore();
    clock.restore();
  });

  it("should return is", (done) => {
    expect(batoto.is).to.be.equal("Batoto");
    done();
  });

  utils.providerBadSourceHostTests(batoto);
  utils.providerNotAuthTests(batoto, "https://bato.to/#bad");

  it(`pages should fail for no auth.`, () => {
    const source: ISource = {
      name: "Bad Page Source",
      source: new URL("https://bato.to/"),
    };
    return batoto.pages(source)
      .then(utils.unexpectedPromise)
      .catch((error: Error) => {
        expect(error).to.be.ok;
        expect(error.message).to.be.ok;
        expect(error.message).to.be.equal("The passed source is in an incorrect format.");
      });
  });

  const generateTests = (local: boolean = true) => {
    before(function() {
      if (!username || !password) { this.skip(); }
    });

    it("should fail to authenticate empty username:password", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        const post = sandbox.stub(cloudkicker, "post");
        get.withArgs(sinon.match({ href: "https://bato.to/forums" }))
          .resolves(noauthResponse);
        post.withArgs(sinon.match({
          href: "https://bato.to/forums/index.php?app=core&do=process&module=global&section=login",
        })).resolves(noauthResponse);
      }
      return batoto.authenticate("", "")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(batoto.isAuthenticated).to.be.equal(false);
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("username is not supplied");
        });
    });

    it("should fail to authenticate empty password", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        const post = sandbox.stub(cloudkicker, "post");
        get.withArgs(sinon.match({ href: "https://bato.to/forums" }))
          .resolves(noauthResponse);
        post.withArgs(sinon.match({
          href: "https://bato.to/forums/index.php?app=core&do=process&module=global&section=login",
        })).resolves(noauthResponse);
      }
      return batoto.authenticate(username, "")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(batoto.isAuthenticated).to.be.equal(false);
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("password is not supplied");
        });
    });

    it("should authenticate username:password", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        const post = sandbox.stub(cloudkicker, "post");
        handleAuth(get, post);
      }
      return batoto.authenticate(username, password)
        .then(() => {
          expect(batoto.isAuthenticated).to.be.equal(true);
          const cookies: string = cloudkicker.cookieJar.getCookieString(batoto.baseURL);
          expect(cookies).to.match(/ipsconnect\w+?/);
          expect(cookies).to.match(/member_id=\d+?/);
          expect(cookies).to.match(/pass_hash=\w+?/);
          expect(cookies).to.match(/session_id=\w+?/);
        });
    });

    // Search
    [
      {
        fixture: "Batoto/search_knights_magic.html",
        href: "https://bato.to/search?name=Knights+%26+Magic&name_cond=c&p=1",
        name: "Knights & Magic",
        sourceHref: "https://bato.to/comic/_/knights-magic-r19716",
      }, {
        fixture: "Batoto/search_one_piece.html",
        href: "https://bato.to/search?name=One+Piece&name_cond=c&p=1",
        name: "One Piece",
        sourceHref: "https://bato.to/comic/_/one-piece-r39",
      }, {
        fixture: "Batoto/search_tensei_shitara_slime_datta_ken.html",
        href: "https://bato.to/search?name=Tensei+Shitara+Slime+Datta+Ken&name_cond=c&p=1",
        name: "Tensei Shitara Slime Datta Ken",
        sourceHref: "https://bato.to/comic/_/tensei-shitara-slime-datta-ken-r15553",
      },
    ].forEach(({name, sourceHref, href, fixture}) => {
      it(`should get find result for '${name}'`, () => {
        const source: ISource = {
          name: (name),
          source: new URL(href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return batoto.authenticate(username, password).then(() => {
          return batoto.find(name).then((result) => {
            expect(result.name).to.be.ok;
            expect(result.name).to.be.equal(name);
            expect(result.source).to.be.ok;
            expect(result.source.href).to.be.equal(sourceHref);
          });
        });
      });
    });
    if (local) {
      it("should get find result for 'Knights & Magic' from cache", () => {
        const name = "Knights & Magic";
        const href = "https://bato.to/search?name=Knights+%26+Magic&name_cond=c";
        const sourceHref = "https://bato.to/comic/_/knights-magic-r19716";
        const source: ISource = {
          name: (name),
          source: new URL(href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .rejects(new Error("This should have hit the local cache."));
        }
        return batoto.authenticate(username, password).then(() =>
          batoto.find(name).then((result) => {
            expect(result.name).to.be.ok;
            expect(result.name).to.be.equal(name);
            expect(result.source).to.be.ok;
            expect(result.source.href).to.be.equal(sourceHref);
          }));
      });
    }

    // Details
    [
      {
        fixture: "Batoto/tensei-shitara-slime-datta-ken-r15553.html",
        href: "https://bato.to/comic/_/comics/tensei-shitara-slime-datta-ken-r15553",
        name: "Tensei Shitara Slime Datta Ken",
      }, {
        fixture: "Batoto/knights-magic-r19716.html",
        href: "https://bato.to/comic/_/comics/knights-magic-r19716",
        name: "Knights & Magic",
      },
    ].forEach(({name, href, fixture}) => {
      it(`should get details for '${name}'`, () => {
        const source: ISource = {
          name: (name),
          source: new URL(href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return batoto.authenticate(username, password).then(() =>
          batoto.details(source).then((details) => {
            expect(details).to.be.ok;
            // Name
            expect(details.name).to.be.ok;
            expect(details.name).to.be.equal(name);
            // Genres
            if (!details.about) { throw new Error("about is not defined"); }
            expect(details.about).to.be.ok;
            if (!details.about.genres) { throw new Error("about.genres is not defined"); }
            expect(details.about.genres).to.be.ok;
            expect(details.about.genres).to.have.length.above(0);
          }));
      });
    });

    // Chapters
    [
      {
        fixture: "Batoto/tensei-shitara-slime-datta-ken-r15553.html",
        href: "https://bato.to/comic/_/comics/tensei-shitara-slime-datta-ken-r15553",
        name: "Tensei Shitara Slime Datta Ken",
      }, {
        fixture: "Batoto/knights-magic-r19716.html",
        href: "https://bato.to/comic/_/comics/knights-magic-r19716",
        name: "Knights & Magic",
      },
    ].forEach(({name, href, fixture}) => {
      it(`should get chapters for '${name}'`, () => {
        const source: ISource = {
          name: (name),
          source: new URL(href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(fixture) } });
        }
        return batoto.authenticate(username, password).then(() =>
          batoto.chapters(source).then((chapters) => {
            expect(chapters).to.be.ok;
            expect(chapters).to.be.length.above(0);
            const chapter = chapters[0];
            expect(chapter.name).to.be.ok;
            expect(chapter.source).to.be.ok;
            expect(chapter.chapter).to.be.ok;
            expect(chapter.chapter).to.be.equal(1);
          }));
      });
    });

    // Pages
    [
      {
        id: "6ea8e6e5c58ce873",
        name: "Death~ and Reincarnation", // Tensei Shitara Slime Datta Ken
        pageSize: 47,
      }, {
        id: "a259d86394bc0bdd",
        name: "Let's Ride a Robot", // Knights & Magic
        pageSize: 40,
      },
    ].forEach(({name, id, pageSize}) => {
      it(`should get pages for '${name}' 'Chapter 1'`, () => {
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          const post = sandbox.stub(cloudkicker, "post");
          handleAuth(get, post);
          _.range(1, pageSize + 1, 2).forEach((pageNumber) => {
            get.withArgs(sinon.match({ href: `https://bato.to/areader?id=${id}&p=${pageNumber}&supress_webtoon=t` }))
              .resolves({ response: { body: utils.getFixture(`Batoto/${id}/${pageNumber}.html`) } });
          });
        }
        const source: ISource = {
          name: (name),
          source: new URL(`https://bato.to/reader#${id}`),
        };
        return batoto.authenticate(username, password).then(() =>
          batoto.pages(source).then((pages) => {
            expect(pages).to.be.ok;
            expect(pages).to.be.length.above(0);
            expect(pages).to.be.lengthOf(pageSize);
            pages.forEach((page) => {
              expect(page.name).to.be.ok;
              expect(page.name).to.match(/^img/);
              expect(page.name).to.match(/\.\w{3,4}$/);
            });
          }));
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
        batoto.clearCache();
      });
      generateTests(false);
    }
  });

});
