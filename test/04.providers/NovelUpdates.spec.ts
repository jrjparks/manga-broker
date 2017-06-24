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
import { NovelUpdates } from "../../src/providers/NovelUpdates";
import * as utils from "../utils";

describe("NovelUpdates Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const provider = new NovelUpdates(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  const username = process.env["NOVELUPDATES-TEST-USER"] || "testuser";
  const password = process.env["NOVELUPDATES-TEST-PASS"] || "testuser";

  before(() => {
    cloudkicker.clearCookieJar();
    provider.clearCache();
  });
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

  const authResponse = {
    response: {
      body: utils.getFixture("NovelUpdates/auth.html").toString().replace("%USERNAME%", username),
    },
  };
  const noauthResponse = { response: { body: utils.getFixture("NovelUpdates/noauth.html") } };

  const handleAuth = (get: sinon.SinonStub, post: sinon.SinonStub) => {
    get.withArgs(sinon.match({ href: "https://www.novelupdates.com/" })).resolves(authResponse);
    post.withArgs(sinon.match({ href: "https://www.novelupdates.com/login/" })).resolves(authResponse);
    [ // Set cookies
      `wordpress_logged_in_d41d8cd98f00b204e9800998ecf8427e=${username}%0a0000000000%0aaaaaaaa0aaaaaaaaaaaaaaaaaaa0a0aaaaa0aaaaaaa%0a000aaa0a000a000a00a00a000000a000000a00000000a00a00a000000aa0000a`,
      `wordpress_d41d8cd98f00b204e9800998ecf8427e=${username}%0a0000000000%0aaaaaaaa0aaaaaaaaaaaaaaaaaaa0a0aaaaa0aaaaaaa%0a000aaa0a000a000a00a00a000000a000000a00000000a00a00a000000aa0000a`,
    ].map(request.cookie).forEach((cookie: request.Cookie) =>
      cloudkicker.cookieJar.setCookie(cookie, provider.baseURL));
  };

  it("should return is", (done) => {
    expect(provider.is).to.be.equal("NovelUpdates");
    done();
  });

  utils.providerBadSourceHostTests(provider);
  // utils.providerNotAuthTests(provider, "https://www.novelupdates.com/#bad");

  const generateTests = (local: boolean = true) => {

    it("should fail to authenticate empty username:password", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        const post = sandbox.stub(cloudkicker, "post");
        get.withArgs(sinon.match({ href: "https://www.novelupdates.com/" }))
          .resolves(noauthResponse);
        post.withArgs(sinon.match({
          href: "https://www.novelupdates.com/login/",
        })).resolves(noauthResponse);
      }
      return provider.authenticate("", "")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(provider.isAuthenticated).to.be.equal(false);
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("username is not supplied");
        });
    });

    it("should fail to authenticate empty password", () => {
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        const post = sandbox.stub(cloudkicker, "post");
        get.withArgs(sinon.match({ href: "https://www.novelupdates.com/" }))
          .resolves(noauthResponse);
        post.withArgs(sinon.match({
          href: "https://www.novelupdates.com/login/",
        })).resolves(noauthResponse);
      }
      return provider.authenticate(username, "")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(provider.isAuthenticated).to.be.equal(false);
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
      return provider.authenticate(username, password)
        .then(() => {
          expect(provider.isAuthenticated).to.be.equal(true);
          const cookies: string = cloudkicker.cookieJar.getCookieString(provider.baseURL);
          expect(cookies).to.match(new RegExp(`wordpress_logged_in_[\\w\\_]+?=${username}[\\w\\%]`));
          expect(cookies).to.match(new RegExp(`wordpress_\\w+?=${username}[\\w\\%]`));
        });
    });

    [
      {
        description: (desc: string) => {
          expect(desc).to.include("In this world, the concept of");
          expect(desc).to.include("bestowed by the Gods a special");
          expect(desc).to.include("If you defeat a monster, you can be rich");
        },
        detailsInfo: {
          fixture: "NovelUpdates/lv999_villager.html",
          href: "https://www.novelupdates.com/series/lv999-villager/",
        },
        genres: [
          Genre.Action, Genre.Adventure, Genre.Comedy,
          Genre.Drama, Genre.Fantasy, Genre.Shounen,
        ],
        name: "LV999 Villager",
        searchInfo: {
          fixture: "NovelUpdates/search_LV999_Villager.html",
          href: "https://www.novelupdates.com/?post_type=seriesplans&s=LV999+Villager",
        },
      }, {
        description: (desc: string) => {
          expect(desc).to.include("kept Hyun-Soo busy");
          expect(desc).to.include("was doing a side job");
          expect(desc).to.include("the Skill Maker");
        },
        detailsInfo: {
          fixture: "NovelUpdates/the_skill_maker.html",
          href: "https://www.novelupdates.com/series/the-skill-maker/",
        },
        genres: [
          Genre.Action, Genre.Adventure, Genre.Fantasy,
          Genre.Supernatural,
        ],
        name: "The Skill Maker",
        searchInfo: {
          fixture: "NovelUpdates/search_The_Skill_Maker.html",
          href: "https://www.novelupdates.com/?post_type=seriesplans&s=The+Skill+Maker",
        },
      },
    ].forEach(({name, detailsInfo, searchInfo, description, genres}) => {
      it(`should return search result for ${name}`, () => {
        const source: ISource = {
          name: (name),
          source: new URL(searchInfo.href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          // const post = sandbox.stub(cloudkicker, "post");
          // handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(searchInfo.fixture) } });
        }
        return provider.search(name)
          .then(({results}) => {
            expect(results).to.be.ok;
            const result = results[0];
            expect(result.name).to.be.ok;
            expect(result.name).to.be.equal(name);
            expect(result.source).to.be.ok;
            expect(result.source.href).to.be.equal(detailsInfo.href);
          });
      });

      it(`should return details for ${name}`, () => {
        const source: ISource = {
          name: (name),
          source: new URL(detailsInfo.href),
        };
        if (local) {
          const get = sandbox.stub(cloudkicker, "get");
          // const post = sandbox.stub(cloudkicker, "post");
          // handleAuth(get, post);
          get.withArgs(sinon.match({ href: (source.source.href) }))
            .resolves({ response: { body: utils.getFixture(detailsInfo.fixture) } });
        }
        return provider.details(source)
          .then((details) => {
            expect(details).to.be.ok;
            expect(details.name).to.be.equal(name);

            if (!details.about) { throw new Error("about is not defined"); }
            if (!details.about.genres) { throw new Error("about.genres is not defined"); }
            expect(details.about.genres).to.be.ok;
            expect(details.about.genres).to.have.members(genres);
            if (!details.about.description) { throw new Error("about.description is not defined"); }
            description(details.about.description);
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
