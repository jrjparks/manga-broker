/// <reference types="mocha"/>
import { expect } from "chai";
import * as broker from "../src";
import * as provider from "../src/provider";

describe("Index Load Sanity Tests", () => {
  it("should import manga-broker", () => {
    expect(broker).to.be.ok;
  });

  describe("Providers Load Sanity Tests", () => {
    it("should import manga-broker.Providers", () => {
      expect(broker.Providers).to.be.ok;
    });

    Object.keys(broker.Providers).forEach((name) => {
      it(`should import manga-broker.Providers.${name}`, () => {
        const prvdr: provider.IProvider = new ((broker.Providers as any)[name])();
        expect(prvdr).to.be.ok;
        expect(prvdr.is).to.be.ok;
        expect(prvdr.is).to.be.a("string");
        expect(prvdr.details).to.be.a("function");
        expect(prvdr.search).to.be.a("function");
        if (prvdr instanceof provider.ProviderCore) {
          expect(prvdr.clearCache).to.be.a("function");
        }
        if (provider.isSourceProvider(prvdr)) {
          expect(prvdr.chapters).to.be.a("function");
          expect(prvdr.pages).to.be.a("function");
        }
        if (provider.isAuthentableProvider(prvdr)) {
          expect(prvdr.authenticate).to.be.a("function");
          expect(prvdr.deauthenticate).to.be.a("function");
        }
      });
    });
  });

  describe("Models Load Sanity Tests", () => {
    it("should import manga-broker.Models", () => {
      expect(broker.Models).to.be.ok;
    });

    Object.keys(broker.Models).forEach((name) => {
      it(`should import manga-broker.Models.${name}`, () => {
        expect((broker.Models as any)[name]).to.be.ok;
      });
    });
  });
});
