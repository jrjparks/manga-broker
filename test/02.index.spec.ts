/// <reference types="mocha"/>
import { expect } from "chai";
import * as broker from "../src";
import * as providers from "../src/providers/provider";

describe("Index Load Sanity Tests", () => {
  it("should import manga-broker", () => {
    expect(broker).to.be.ok;
  });

  describe("Providers Load Sanity Tests", () => {
    it("should import manga-broker.Providers", () => {
      expect(broker.Providers).to.be.ok;
    });

    Object.keys(broker.Providers).forEach((name) => {
      const provider: providers.IProvider = new ((broker.Providers as any)[name])();
      if (providers.isProvider(provider)) {
        it(`should import manga-broker.Providers.${name}`, () => {
          expect(provider).to.be.ok;
          expect(provider.is).to.be.ok;
          expect(provider.is).to.be.a("string");
          expect(provider.details).to.be.a("function");
          expect(provider.search).to.be.a("function");
          if (provider instanceof providers.ProviderCore) {
            expect(provider.clearCache).to.be.a("function");
          }
          if (providers.isSourceProvider(provider)) {
            expect(provider.chapters).to.be.a("function");
            expect(provider.pages).to.be.a("function");
          }
          if (providers.isAuthentableProvider(provider)) {
            expect(provider.authenticate).to.be.a("function");
            expect(provider.deauthenticate).to.be.a("function");
          }
        });
      }
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
