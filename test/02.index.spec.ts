/// <reference types="mocha"/>
import { expect } from "chai";
import * as broker from "../src";
import { IAuthentableProvider, IProvider, ISourceProvider, ProviderCore } from "../src/provider";

describe("Index Load Sanity Tests", () => {
  it("should import manga-broker", () => {
    expect(broker).to.be.ok;
  });

  describe("Providers Load Sanity Tests", () => {
    it("should import manga-broker.Providers", () => {
      expect(broker.Providers).to.be.ok;
    });

    Object.keys(broker.Providers).forEach((name) => {
      const testIsSourceProvider = (provider: IProvider): provider is ISourceProvider => {
        return (provider as ISourceProvider) &&
          (provider as ISourceProvider).chapters !== undefined &&
          (provider as ISourceProvider).pages !== undefined;
      };
      const testIsAuthentableProvider = (provider: IProvider): provider is IAuthentableProvider => {
        return (provider as IAuthentableProvider) &&
          (provider as IAuthentableProvider).authenticate !== undefined &&
          (provider as IAuthentableProvider).deauthenticate !== undefined;
      };
      it(`should import manga-broker.Providers.${name}`, () => {
        const provider: IProvider = new ((broker.Providers as any)[name])();
        expect(provider).to.be.ok;
        expect(provider.is).to.be.ok;
        expect(provider.is).to.be.a("string");
        expect(provider.details).to.be.a("function");
        expect(provider.search).to.be.a("function");
        if (provider instanceof ProviderCore) {
          expect(provider.clearCache).to.be.a("function");
        }
        if (testIsSourceProvider(provider)) {
          expect(provider.chapters).to.be.a("function");
          expect(provider.pages).to.be.a("function");
        }
        if (testIsAuthentableProvider(provider)) {
          expect(provider.authenticate).to.be.a("function");
          expect(provider.deauthenticate).to.be.a("function");
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
