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
    it("should test sandbox", (done) => {
      const decryptionKeySandbox = kissmangaurldecrypter["sandbox"];
      (decryptionKeySandbox as any).alert();
      (decryptionKeySandbox as any).location.reload();
      done();
    });

    [
      {
        encryptedUrl: ["y3Ae7Tx3IwPALzRhIZ2r2EG7MBAP5UBOiMubDezd1KbQ7e8UgTefoL",
          "CIOUzK//24sJTm2c5X7t3pj24JFcZBOn10yOIzyBwocyDdPi/JXa/WCXDqZsgCZSuas",
          "HR0Z5L/6cHHIF10wH7vd0JFRIveA6H1HcS7tPT0+An/so3xXs8="].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/-IIuMHYKvrcM/WfVBkn41",
          "G-I/AAAAAAAA0Lc/E5Em_qQeofk57IeKO44XwkQHr9rExNYcgCHMYCw/s0/000.jpg"
        ].join(""),
      }, {
        encryptedUrl: ["y3Ae7Tx3IwPALzRhIZ2r2LA7/mHFOEWDd70xrGv/ziCkcwq/oQ/dP3",
          "H36x4HmfBVHmsvvNiWajgpXqWBDrS4gshP1F7s/XBiSrxBSoHMPRDqzVbuqG2pzZO95",
          "ZsNddwjqpaJ9zVsZtuN4xJMk0HnDtggj0PaTYRSY4hexSYYtvs="].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/-Rm9OF9U1V5I/WfVBkwCd",
          "01I/AAAAAAAA0Lg/GMH9-CxbC_oTAfy9cE81N1LCt1Qo4U9WACHMYCw/s0/001.jpg"
        ].join(""),
      }, {
        encryptedUrl: ["y3Ae7Tx3IwPALzRhIZ2r2DQJO1S2JlEf711kusXRvDRW2RcS9pl98u",
          "0aq4IlR7CUqCMKiAp0IwgVO3da4eP/rOfH5YFm6KEl+6/zmh+PLAieKJmiFTPqJypvF",
          "WUpa8Bkfru6AE1Tfzc8wwOUZA3I+gbMrXuvjI4rsDVsJqNqFIA="].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/-BGquPHL02mo/WfVBlObC",
          "9gI/AAAAAAAA0Lk/Jf9UbZjefJ4Bn4zaE6Ua95iL3r4r3TqlwCHMYCw/s0/002.jpg"
        ].join(""),
      }, {
        encryptedUrl: ["y3Ae7Tx3IwPALzRhIZ2r2N5ZWvRijU8cbkjXJTlNGTF2P8v46WxBUA",
          "yubMLdIoyxS8Tug1a1vshm+woaiL2xXN1DI2gEMp+MtwfJrqRflTBxtKO+XKbjpwlTm",
          "g3Ru2AwD07A44Ad5b8KbptTAASuhXEZE53quuZWuEu7HwwzZUg="].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/-rrtyRFNwx6w/WYT4qFzN",
          "8GI/AAAAAAAByBs/ooa-L57awdw6XhIqtFFJpC0Wmr4-0TWbgCHMYCw/s0/000.jpg"
        ].join(""),
      }, {
        encryptedUrl: ["y3Ae7Tx3IwPALzRhIZ2r2JyIwr4zrWL2uKfbpOfdZUGDb1ZE45ou3J",
          "tiAd/Td59anHT5Exj1oNiSMNrNelIvtXQabZMGJCoPoY/8AGZiGYRvY/Ad6BPheNmQT",
          "XVi1ndSgUD8pw1suF7XRK8I2dRYaS9hO7gjLq5mdfjOCLtgLss="].join(""),
        expectedDecryptedUrl: ["http://2.bp.blogspot.com/-B-xuCUqIttA/WYT4qlMo",
          "kaI/AAAAAAAByB0/nw4Moi0s4HA4JHng_UoA-3sW8Km4ysudACHMYCw/s0/002.jpg"
        ].join(""),
      },
    ].forEach(({ encryptedUrl, expectedDecryptedUrl }, index) => {
      it(`should decode encrypted url #${index + 1}`, () => {
        return kissmangaurldecrypter.getWrapKA()
          .then((wrapKA) => wrapKA(encryptedUrl))
          .then((decryptedUrl) => {
            expect(decryptedUrl).to.be.ok;
            expect(decryptedUrl).to.be.equal(expectedDecryptedUrl);
          });
      });
    });
  });

});
