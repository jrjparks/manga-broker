/// <reference types="mocha"/>
import { expect } from "chai";
import * as broker from "../src/index";

describe("index Tests", () => {
  describe("SourceProviders Tests", () => {
    [
      broker.SourceProviders.EasyGoingScans,
      broker.SourceProviders.KissManga,
      broker.SourceProviders.MangaPanda,
      broker.SourceProviders.MangaReader,
    ].forEach((Provider) => {
      it(`Test ${(Provider as any).name} import from index`, (done) => {
        const provider = new Provider();
        expect(provider.is).to.be.equal((Provider as any).name);
        expect(provider.details).to.be.a("function");
        expect(provider.search).to.be.a("function");
        expect(provider.clearCache).to.be.a("function");
        expect(provider.chapters).to.be.a("function");
        expect(provider.pages).to.be.a("function");
        done();
      });
    });
  });

  describe("DatabaseProviders Tests", () => {
    [
      broker.DatabaseProviders.MangaUpdates,
    ].forEach((Provider) => {
      it(`Test ${(Provider as any).name} import from index`, (done) => {
        const provider = new Provider();
        expect(provider.is).to.be.equal((Provider as any).name);
        expect(provider.details).to.be.a("function");
        expect(provider.search).to.be.a("function");
        expect(provider.clearCache).to.be.a("function");
        done();
      });
    });
  });
});
