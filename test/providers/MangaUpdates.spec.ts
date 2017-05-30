/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import { Genre, IDetails, ISource } from "../../src/models";
import { MangaUpdates } from "../../src/providers/MangaUpdates";
import * as utils from "../utils";

describe("MangaUpdates Tests", () => {
  const cloudkicker: CloudKicker = new CloudKicker();
  const mangaupdates = new MangaUpdates(cloudkicker);
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
    it("should return search results from request", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({
          response: {
            body: utils.getFixture("MangaUpdates/search_One_Punch-Man.html"),
          },
        });
      return mangaupdates.search("One Punch-Man")
        .then(({results}) => {
          expect(results).to.be.ok;
          expect(results).to.have.length.above(2);
          const result: IDetails = results[0];
          expect(result).to.be.ok;
          if (!result.about) {
            throw new Error("about is not defined");
          }
          expect(result.about).to.be.ok;
          if (!result.about.genres) {
            throw new Error("about.genres is not defined");
          }
          expect(result.about.genres).to.be.ok;
          expect(result.about.genres).to.have.members([Genre.Action, Genre.Comedy, Genre.Fantasy, Genre.Mature]);
        });
    });

    it("should return search results from cache", () => {
      sandbox.stub(cloudkicker, "get")
        .resolves({
          response: {
            body: undefined,
          },
        });
      return mangaupdates.search("One Punch-Man", { fuzzy: true })
        .then(({results}) => {
          expect(results).to.be.ok;
          expect(results).to.have.lengthOf(1);
        });
    });

    [33, 80345, 135331].forEach((id) => {
      it(`should return details for ${id}`, () => {
        sandbox.stub(cloudkicker, "get")
          .resolves({
            response: {
              body: utils.getFixture(`MangaUpdates/details_${id}.html`),
            },
          });
        const source: ISource = {
          name: "Test Details",
          source: new URL(`https://www.mangaupdates.com/series.html?id=${id}`),
        };
        return mangaupdates.details(source)
          .then((details) => {
            expect(details).to.be.ok;
            expect(details.name).to.be.ok;
          });
      });
    });
  });

  describe("Remote Live Tests", () => {
    if (utils.CI) {
      it.skip("detected running on CI, skipping");
    } else {
      it("should return search result from request");
      it("should return search result from cache");
      [33, 80345, 135331].forEach((id) => {
        it(`should return details for ${id}`);
      });
    }
  });
});
