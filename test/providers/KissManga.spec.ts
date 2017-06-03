/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models";
import { KissManga } from "../../src/providers/KissManga";
import * as utils from "../utils";

describe("KissManga Tests", () => {
  const cloudkicker: CloudKicker = new CloudKicker();
  const kissmanga = new KissManga(cloudkicker);
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  it("should return is", (done) => {
    expect(kissmanga.is).to.be.equal("KissManga");
    done();
  });

  utils.providerBadSourceHostTests(kissmanga);

  const generateTests = (local: boolean = true) => {
    it("should return search result for 'One Punch-Man'", () => {
      if (local) {
        const post = sandbox.stub(cloudkicker, "post");
        post.withArgs(sinon.match({ href: "https://kissmanga.com/Search/Manga" }))
          .resolves({ response: { body: utils.getFixture("KissManga/Search_Manga_One_Punch-Man.html") } });
      }
      return kissmanga.search("One Punch-Man")
        .then(({results}) => {
          const result = results[0];
          expect(result.name).to.be.ok;
          expect(result.name).to.be.equal("Onepunch-Man");
          expect(result.source).to.be.ok;
          expect(result.source.href).to.be.equal("https://kissmanga.com/Manga/Onepunch-Man");
        });
    });

    it("should return chapters for 'Knights & Magic'", () => {
      const source: ISource = {
        name: "Knights & Magic",
        source: new URL("https://kissmanga.com/Manga/Knights-Magic"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("KissManga/Knights-Magic.html") } });
      }
      return kissmanga.chapters(source)
        .then((chapters) => {
          expect(chapters).to.be.ok;
          expect(chapters).to.have.length.above(0);
          const chapter = chapters[0];
          expect(chapter).to.be.ok;
          expect(chapter.chapter).to.be.ok;
          expect(chapter.chapter).to.be.equal(1);
        });
    });

    it("should return pages for 'Knights & Magic' 'Chapter 1'", () => {
      const source: ISource = {
        name: "Let's Ride a Robot",
        source: new URL("https://kissmanga.com/Manga/Knights-Magic/Ch-001--Let-s-Ride-a-Robot?id=321203"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/ca.js" }))
          .resolves({ response: { body: utils.getFixture("KissManga/ca.js") } });
        get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/lo.js" }))
          .resolves({ response: { body: utils.getFixture("KissManga/lo.js") } });
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("KissManga/Knights-Magic-Ch-001.html") } });
      }
      return kissmanga.pages(source)
        .then((pages) => {
          expect(pages).to.be.ok;
          expect(pages).to.have.length.above(0);
          const page = pages[0];
          expect(page).to.be.ok;
          expect(page.name).to.be.ok;
          expect(page.name).to.be.equal("000_1474181393.jpg");
          expect(page.source).to.be.ok;
        });
    });

    it("should return chapters for 'Onepunch-Man'", () => {
      const source: ISource = {
        name: "Knights & Magic",
        source: new URL("https://kissmanga.com/Manga/Onepunch-Man"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("KissManga/Onepunch-Man.html") } });
      }
      return kissmanga.chapters(source)
        .then((chapters) => {
          expect(chapters).to.be.ok;
          expect(chapters).to.have.length.above(0);
          const chapter = chapters[0];
          expect(chapter).to.be.ok;
          expect(chapter.chapter).to.be.ok;
          expect(chapter.chapter).to.be.equal(1);
        });
    });

    it("should return pages for 'Onepunch-Man' 'Chapter 1'", () => {
      const source: ISource = {
        name: "Onepunch-Man _vol.001 ch.001",
        source: new URL("https://kissmanga.com/Manga/Onepunch-Man/vol-001-ch-001?id=313725"),
      };
      if (local) {
        const get = sandbox.stub(cloudkicker, "get");
        get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/ca.js" }))
          .resolves({ response: { body: utils.getFixture("KissManga/ca.js") } });
        get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/lo.js" }))
          .resolves({ response: { body: utils.getFixture("KissManga/lo.js") } });
        get.withArgs(sinon.match({ href: (source.source.href) }))
          .resolves({ response: { body: utils.getFixture("KissManga/Onepunch-Man-vol-001-ch-001.html") } });
      }
      return kissmanga.pages(source)
        .then((pages) => {
          expect(pages).to.be.ok;
          expect(pages).to.have.length.above(0);
          const page = pages[0];
          expect(page).to.be.ok;
          expect(page.name).to.be.ok;
          expect(page.name).to.be.equal("1.jpg");
          expect(page.source).to.be.ok;
        });
    });

    it("should fail to return details", () => {
      const source: ISource = {
        name: "Test Source",
        source: new URL("https://kissmanga.com/Manga/Knights-Magic/"),
      };
      return kissmanga.details(source)
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.equal("This function is not supported by this provider.");
        });
    });
  };

  describe("Local File Tests", () => {
    before(() => {
      cloudkicker.clearCookieJar();
      kissmanga.clearCache();
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
        kissmanga.clearCache();
        sandbox.restore();
        clock.restore();
      });
      generateTests(false);
    }
  });

});
