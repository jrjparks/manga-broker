/// <reference types="mocha"/>
import { expect } from "chai";
import * as sinon from "sinon";
import fs = require("fs");
import { URL } from "url";
import { ISource } from "../src/models/source";
import { IProvider, ISourceProvider } from "../src/provider";
export const CI = process.env.CI;

export function getFixture(path: string) {
  return fs.readFileSync(`${__dirname}/fixtures/${path}`);
}

export function handleUnhandledArgs(stub: sinon.SinonStub) {
  stub.withArgs(sinon.match(function() { // tslint:disable-line
    console.log(arguments); // tslint:disable-line
  })).rejects(new Error("Unhandled Stub"));
}

export function unexpectedPromise(result: any) {
  throw new Error(`Promise was unexpectedly fulfilled. Result: ${JSON.stringify(result)}`);
}

export function providerBadSourceHostTests(provider: IProvider | ISourceProvider) {
  const source: ISource = {
    name: "example.com",
    source: new URL("http://example.com/"),
  };
  const badSourceErrorCatch = (error: Error) => {
    expect(error).to.be.ok;
    expect(error.message).to.be.ok;
    expect(error.message).to.be.equal("The passed source was not for this provider.");
  };
  const isSourceProvider = (iface: any): iface is ISourceProvider => {
    return iface.chapters !== undefined;
  };
  it(`details should fail for wrong host.`, () => {
    return provider.details(source)
      .then(unexpectedPromise)
      .catch(badSourceErrorCatch);
  });
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
}
