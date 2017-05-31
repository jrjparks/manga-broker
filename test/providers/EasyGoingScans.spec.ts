/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { ISource } from "../../src/models";
import { EasyGoingScans } from "../../src/providers/EasyGoingScans";
import * as utils from "../utils";

describe("EasyGoingScans Tests", () => {
  const cloudkicker: CloudKicker = new CloudKicker();
  const egscans = new EasyGoingScans(cloudkicker);
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

  describe("Local File Tests", () => {
    it("should get cache", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      return egscans["getSearchCache"]()
        .then((cache) => {
          expect(cache.size).to.be.above(0);
        });
    });

    it("should fail for 'One Punch-Man'", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      return egscans.search("One Punch-Man")
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.contain("Title not found.");
        });
    });

    it("should return result for 'Knights & Magic'", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({ response: { body: utils.getFixture("EasyGoingScans/search.html") } });
      return egscans.search("Knights & Magic")
        .then(({results}) => {
          const result = results[0];
          expect(result.name).to.be.ok;
          expect(result.source).to.be.ok;
          expect(result.name).to.be.equal("Knights and Magic");
          expect(result.source.host).to.be.equal("read.egscans.com");
          expect(result.source.pathname).to.be.equal("/Knights_and_Magic");
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
          expect(error.message).to.be.equal("This function has not been implemented.");
        });
    });

    it("should return chapters for 'Knights & Magic'", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({ response: { body: utils.getFixture("EasyGoingScans/Knights_and_Magic.html") } });
      const source: ISource = {
        name: "Knights and Magic",
        source: new URL("http://read.egscans.com/Knights_and_Magic"),
      };
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
      sandbox.stub(cloudkicker, "get")
        .resolves({ response: { body: utils.getFixture("EasyGoingScans/Knights_and_Magic.html") } });
      const source: ISource = {
        name: "Knights and Magic",
        source: new URL("http://read.egscans.com/Knights_and_Magic/Chapter_001"),
      };
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
  });

  describe("Remote Live Tests", function() {
    if (utils.CI) {
      it.skip("detected running on CI, skipping");
    } else {
      this.timeout(5000);
      this.slow(3000);
      before(() => {
        cloudkicker.clearCookieJar();
        egscans.clearCache();
      });
      it("should request cache", () => {
        return egscans["getSearchCache"]()
          .then((cache) => {
            expect(cache.size).to.be.above(0);
          });
      });
      it("should fail for 'One Punch-Man'", () => {
        return egscans.search("One Punch-Man")
          .then(utils.unexpectedPromise)
          .catch((error) => {
            expect(error).to.be.ok;
            expect(error.message).to.be.contain("Title not found.");
          });
      });
      it("should return result for 'Knights and Magic'", () => {
        return egscans.search("Knights & Magic")
          .then(({results}) => {
            const result = results[0];
            expect(result.name).to.be.ok;
            expect(result.source).to.be.ok;
            expect(result.name).to.be.equal("Knights and Magic");
            expect(result.source.host).to.be.equal("read.egscans.com");
            expect(result.source.pathname).to.be.equal("/Knights_and_Magic");
          });
      });
      it("should return chapters for 'Knights and Magic'", () => {
        const source: ISource = {
          name: "Knights and Magic",
          source: new URL("http://read.egscans.com/Knights_and_Magic"),
        };
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
      it("should return pages for 'Knights and Magic' 'Chapter 001'", () => {
        const source: ISource = {
          name: "Knights and Magic",
          source: new URL("http://read.egscans.com/Knights_and_Magic/Chapter_001"),
        };
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
    }
  });
});
