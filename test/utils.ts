/// <reference types="mocha"/>
import { expect } from "chai";
import * as sinon from "sinon";
import fs = require("fs");
import { URL } from "url";
import { ISource } from "../src/models/source";
import {
  IAuthentableProvider,
  IProvider,
  isAuthentableProvider,
  isNovelProvider,
  isProvider,
  isSourceProvider,
} from "../src/provider";
export const CI = process.env.CI;

export function getFixture(path: string) {
  return fs.readFileSync(`${__dirname}/_fixtures_/${path}`);
}

export function handleUnhandledArgs(stub: sinon.SinonStub) {
  stub.withArgs(sinon.match(function() { // tslint:disable-line
    console.log(arguments); // tslint:disable-line
  })).rejects(new Error("Unhandled Stub"));
}

export function unexpectedPromise(result: any) {
  throw new Error(`Promise was unexpectedly fulfilled. Result: ${JSON.stringify(result)}`);
}

export function providerBadSourceHostTests(provider: IProvider) {
  const source: ISource = {
    name: "example.com",
    source: new URL("http://example.com/"),
  };
  const badSourceErrorCatch = (error: Error) => {
    expect(error).to.be.ok;
    expect(error.message).to.be.ok;
    expect(error.message).to.be.equal("The passed source was not for this provider.");
  };
  if (isProvider(provider)) {
    it(`details should fail for wrong host.`, () => {
      return provider.details(source)
        .then(unexpectedPromise)
        .catch(badSourceErrorCatch);
    });
  }
  if (isSourceProvider(provider)) {
    it(`chapters should fail for wrong host.`, () => {
      return provider.chapters(source)
        .then(unexpectedPromise)
        .catch(badSourceErrorCatch);
    });
    it(`pages should fail for wrong host.`, () => {
      return provider.pages(source)
        .then(unexpectedPromise)
        .catch(badSourceErrorCatch);
    });
  }
  if (isNovelProvider(provider)) {
    it(`chapters should fail for wrong host.`, () => {
      return provider.chapters(source)
        .then(unexpectedPromise)
        .catch(badSourceErrorCatch);
    });
    it(`chapter should fail for wrong host.`, () => {
      return provider.chapter(source)
        .then(unexpectedPromise)
        .catch(badSourceErrorCatch);
    });
  }
}

export function providerNotAuthTests(provider: IProvider & IAuthentableProvider, href: string) {
  const source: ISource = {
    name: href || "example.com",
    source: new URL(href || "http://example.com/"),
  };
  const notAuthErrorCatch = (error: Error) => {
    expect(error).to.be.ok;
    expect(error.message).to.be.ok;
    expect(error.message).to.be.equal("Provider requires authentication.");
  };

  if (isProvider(provider) && isAuthentableProvider(provider)) {
    it(`details should fail for no auth.`, () => {
      return provider.details(source)
        .then(unexpectedPromise)
        .catch(notAuthErrorCatch);
    });
  }
  if (isSourceProvider(provider) && isAuthentableProvider(provider)) {
    it(`chapters should fail for no auth.`, () => {
      return provider.chapters(source)
        .then(unexpectedPromise)
        .catch(notAuthErrorCatch);
    });
    it(`pages should fail for no auth.`, () => {
      return provider.pages(source)
        .then(unexpectedPromise)
        .catch(notAuthErrorCatch);
    });
  }
  if (isNovelProvider(provider) && isAuthentableProvider(provider)) {
    it(`pages should fail for no auth.`, () => {
      return provider.chapter(source)
        .then(unexpectedPromise)
        .catch(notAuthErrorCatch);
    });
  }
}
