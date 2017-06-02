/// <reference types="mocha"/>
import { expect } from "chai";
import { stringEnum } from "../src/StringEnum";
import * as Diacritics from "../src/util/Diacritics";
import { levenshtein } from "../src/util/Levenshtein";
import { StringUtil } from "../src/util/string";

describe("StringEnum Function Tests", () => {
  it("should create stringEnum", (done) => {
    const Direction = stringEnum([
      "Up",
      "Down",
      "Left",
      "Right",
    ]);
    type Direction = keyof typeof Direction;
    expect(Direction.Up).to.be.equal("Up");
    expect(Direction.Left).to.be.equal("Left");
    expect(Direction.Right).to.not.be.equal("Down");
    done();
  });
});

describe("Diacritics Function Tests", () => {
  it("should return unchanged result", (done) => {
    const value: string = "Hello World";
    const cleanedValue = Diacritics.clean(value);
    expect(cleanedValue).to.be.equal(value);
    done();
  });

  it("should return unchanged result", (done) => {
    const value: string = "ナ";
    const cleanedValue = Diacritics.clean(value);
    expect(cleanedValue).to.be.equal(value);
    done();
  });

  it("should return changed result '\u1EA6' => 'A'", (done) => {
    const value = Diacritics.clean("\u1EA6");
    expect(value).to.be.equal("A");
    done();
  });

  it("should return changed result '\uA736' => 'AU'", (done) => {
    const value = Diacritics.clean("\uA736");
    expect(value).to.be.equal("AU");
    done();
  });
});

describe("StringUtil Function Tests", () => {
  it("should return normalized result", (done) => {
    const value: string = StringUtil.normalize("Hello World & the Moon");
    expect(value).to.be.equal("helloworldandthemoon");
    done();
  });

  it("should return similarity result of 1", (done) => {
    const a = "Hello World";
    const b = "Hello World";
    const value: number = StringUtil.similarity(a, b);
    expect(value).to.be.equal(1);
    done();
  });

  it("should return similarity result of 0", (done) => {
    const value: number = StringUtil.similarity("", "");
    expect(value).to.be.equal(0);
    done();
  });
});

describe("Levenshtein Function Tests", () => {
  it("should return 0", (done) => {
    const a = "Hello World";
    const b = "Hello World";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(0);
    done();
  });

  it("should return 4", (done) => {
    const a = "abcd";
    const b = "cdef";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(4);
    done();
  });

  it("should return 10", (done) => {
    const a = "This should";
    const b = "not match";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(10);
    done();
  });

  it("should return 6", (done) => {
    const a = "short string";
    const b = "longer string";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(6);
    done();
  });

  it("should return 11", (done) => {
    const a = "hello world";
    const b = "";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(11);
    done();
  });

  it("should return 11", (done) => {
    const a = "";
    const b = "hello world";
    const value = levenshtein(a, b);
    expect(value).to.be.equal(11);
    done();
  });
});
