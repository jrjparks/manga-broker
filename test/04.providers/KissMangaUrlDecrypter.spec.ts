/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";
import { CloudKicker } from "cloudkicker";
import * as sinon from "sinon";
import { URL } from "url";
import {
  KissMangaUrlDecrypter,
} from "../../src/providers/KissManga";
import * as utils from "../utils";

describe("KissMangaUrlDecrypter Tests", function() {
  this.retries(2);
  const cloudkicker: CloudKicker = new CloudKicker();
  const baseUrl = new URL("https://kissmanga.com");
  let kissmangaurldecrypter: KissMangaUrlDecrypter;
  const testPageContent: Buffer = utils.getFixture("KissManga/Knights-Magic-Ch-001.html");

  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  beforeEach("set-up", () => {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();

    // Load scripts from local disk.
    const get = sandbox.stub(cloudkicker, "get");
    get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/ca.js" }))
      .resolves({ response: { body: utils.getFixture("KissManga/ca.js") } });
    get.withArgs(sinon.match({ href: "https://kissmanga.com/Scripts/lo.js" }))
      .resolves({ response: { body: utils.getFixture("KissManga/lo.js") } });
    kissmangaurldecrypter = new KissMangaUrlDecrypter(baseUrl, cloudkicker, true);
  });
  afterEach("tear-down", () => {
    sandbox.restore();
    clock.restore();
  });

  describe("Local File Tests", () => {
    it("should fail to locate decryption key", () => {
      const badTestPageContent = testPageContent.toString().replace(/SHA256/g, "BAD128");
      return kissmangaurldecrypter.getWrapKA(badTestPageContent)
        .then(utils.unexpectedPromise)
        .catch((error) => {
          expect(error).to.be.ok;
          expect(error.message).to.be.ok;
          expect(error.message).to.be.equal("Unable to locate decryption key.");
        });
    });

    it("should test sandbox", (done) => {
      const decryptionKeySandbox = kissmangaurldecrypter["sandbox"];
      (decryptionKeySandbox as any).alert();
      (decryptionKeySandbox as any).location.reload();
      done();
    });

    [
      {
        encryptedUrl: ["l+pKsY1S/p8HdYHYY1x9JeVR/kaBeW6Yw2z0GLJPzo0XefyFdh",
          "Ji5VGX4ET5fK1Z8VAntlgjysTDXUtNTYLqUtP/2lOmlQbo/xJT",
          "P21H4lVmdw/OV7xI7Y/6om4YQH20ELBqvAuW7g+3xCWcNODrEu",
          "Y3YgQ8E9Aw4nW3oF7yOGLt9CNnbVGMoIYjCKeGDP+J"].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/QXS9LQKBxygxpcsY1-IlcDnKp",
          "ZsycunFdEYoOAd2fdtpgaKyxyPlcRnSIJfP4kSQzw-20VbZ7Zb",
          "j1A=s0?title=000_1474181393.jpg"].join(""),
      }, {
        encryptedUrl: ["l+pKsY1S/p8HdYHYY1x9JVkR8H+4cdqwWOCxSihoutgrC2OQRl",
          "W4B6OU9s/fgp3KxxQRu0jPvwXIQJRmXWEObaSRNf51DyIW25Ag",
          "GkyHTlQJGlmp1bRYw4Z+zE2wkM4tiVq29DXDqlu3N2bIxhgHW6",
          "EmUtlzV80xYmshuOqJR3hnXee9/cEG+MitXnqptb7K"].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/TS0eOgV-BZ6e8VcmRZnk6jezt",
          "eS1a51n4sgVRPBdAv3xt23DhB8eObfiU_ESVXCiv1HT3m9Z3p0",
          "y5A=s0?title=002_1474181393.jpg"].join(""),
      }, {
        encryptedUrl: ["l+pKsY1S/p8HdYHYY1x9JTuBZOf2iOTk/rUckbn3SSyqIUKnOf",
          "eVxntcH0JSO3Dxh35IGTwe3UnvjHPyy/97M53V+FonjWr7JZfH",
          "EwY+DaSxVqaib+JaNF5wWvOq7cJ702EdsvqgcBPsTYPllUhAY3",
          "Ifl5mqLZC98wvr/8wntvq65B2X+W1abyhk5WFR59dr"].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/RCDpsaLpZ6hdf-QnDRoieXgg7",
          "ubcCPQCuU5seCe0B3hkcM9fLo_HH14kBPdmroZ9demMVprQyeU",
          "_Kw=s0?title=036_1474181393.jpg"].join(""),
      }, {
        encryptedUrl: ["l+pKsY1S/p8HdYHYY1x9JfBYPyJ9U4hQBsTiweCchs8wINRGW5",
          "KTlcve3tZhNNNdJhTBMLXTTAJM80S2iig7D4QV8c5ZPfj9Xjgy",
          "h0gP7hDnXmovdm1atKJSzcY9z3aobWw1ge4+x74dTTE2We712j",
          "kyWNiUfljik9IaGcRbFgga2RAmxRWlwh1rsDDI887M"].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/nfas_rLGMAEv8HNhK1M0Y792v",
          "W8lldAp7swT70lm9i_NvbFOI46scoXbAjuNd10iBfMknxGJfi7",
          "o0w=s0?title=038_1474181393.jpg"].join(""),
      }, {
        encryptedUrl: ["l+pKsY1S/p8HdYHYY1x9JTuBZOf2iOTk/rUckbn3SSyqIUKnOf",
          "eVxntcH0JSO3Dxh35IGTwe3UnvjHPyy/97M53V+FonjWr7JZfH",
          "EwY+DaSxVqaib+JaNF5wWvOq7cJ702EdsvqgcBPsTYPllUhAY3",
          "Ifl5mqLZC98wvr/8wntvq65B2X+W1abyhk5WFR59dr"].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/RCDpsaLpZ6hdf-QnDRoieXgg7",
          "ubcCPQCuU5seCe0B3hkcM9fLo_HH14kBPdmroZ9demMVprQyeU",
          "_Kw=s0?title=036_1474181393.jpg"].join(""),
      },
    ].forEach(({encryptedUrl, expectedDecryptedUrl}, index) => {
      it(`should decode encrypted url #${index + 1}`, () => {
        return kissmangaurldecrypter.getWrapKA(testPageContent)
          .then((wrapKA) => wrapKA(encryptedUrl))
          .then((decryptedUrl) => {
            expect(decryptedUrl).to.be.ok;
            expect(decryptedUrl).to.be.equal(expectedDecryptedUrl);
          });
      });
    });
  });

});
