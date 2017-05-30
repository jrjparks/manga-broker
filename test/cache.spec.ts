/// <reference types="mocha"/>
import { expect } from "chai";
import { Cache } from "../src/cache/Cache";
import { ScoredCache } from "../src/cache/ScoredCache";

describe("Cache Tests", () => {
  it("should test Cache<string>", (done) => {
    const cache: Cache<string> = new Cache<string>();
    expect(cache.size).to.be.equal(0);
    const values = "a b c d e f g".split(" ");
    values.reduce((c, value, index) => c.update(value, String(index)), cache);
    expect(cache.size).to.be.equal(values.length);
    expect(cache.get("a").value).to.be.equal("0");
    cache.remove("a");
    expect(cache.size).to.be.equal(values.length - 1);
    cache.clear();
    expect(cache.size).to.be.equal(0);
    done();
  });
});

describe("ScoredCache Tests", () => {
  it("should test ScoredCache<string>", (done) => {
    const cache: ScoredCache<string> = new ScoredCache<string>();
    expect(cache.size).to.be.equal(0);
    const values = "a b c d e f g spike".split(" ");
    values.reduce((c, value, index) => c.update(value, String(index)), cache);
    expect(cache.size).to.be.equal(values.length);
    expect(cache.get("a").value).to.be.equal("0");
    cache.remove("a");
    expect(cache.size).to.be.equal(values.length - 1);
    const mike = cache.bestMatch("mike");
    expect(mike.key).to.be.equal("spike");
    expect(mike.score).to.be.equal(0.6);
    expect(mike.value).to.be.equal("7");
    cache.clear();
    expect(cache.size).to.be.equal(0);
    done();
  });
});
