/* tslint:disable:no-string-literal */
/// <reference types="mocha"/>
import { expect } from "chai";

import {
  IAbout,
} from "../src/models/about";
import {
  IChapter,
} from "../src/models/chapter";
import {
  ICover,
} from "../src/models/cover";
import {
  IDetails,
} from "../src/models/details";
import {
  Genre,
} from "../src/models/genre";
import {
  IMeta,
} from "../src/models/meta";
import {
  ProviderType,
} from "../src/models/providerType";
import {
  IPublisher,
} from "../src/models/publisher";
import {
  ISearchOptions,
  ISearchResults,
} from "../src/models/search";
import {
  ISource,
} from "../src/models/source";
import {
  Status,
} from "../src/models/status";
import {
  Type,
} from "../src/models/type";

describe("Model Tests", () => {
  it("should create an IAbout object", (done) => {
    const about: IAbout = {} as IAbout;
    expect(about).to.be.ok;
    done();
  });

  it("should create an IChapter object", (done) => {
    const chapter: IChapter = {} as IChapter;
    expect(chapter).to.be.ok;
    done();
  });

  it("should create an ICover object", (done) => {
    const cover: ICover = {} as ICover;
    expect(cover).to.be.ok;
    done();
  });

  it("should create an IDetails object", (done) => {
    const details: IDetails = {} as IDetails;
    expect(details).to.be.ok;
    done();
  });

  it("should create an Genre object", (done) => {
    const genre: Genre = Genre.Action;
    expect(genre).to.be.ok;
    done();
  });

  it("should create an IMeta object", (done) => {
    const meta: IMeta = {} as IMeta;
    expect(meta).to.be.ok;
    done();
  });

  it("should create an ProviderType object", (done) => {
    const providerType: ProviderType = ProviderType.None;
    expect(providerType).to.equal(ProviderType.None);
    done();
  });

  it("should create an IPublisher object", (done) => {
    const publisher: IPublisher = {} as IPublisher;
    expect(publisher).to.be.ok;
    done();
  });

  it("should create an ISearchOptions object", (done) => {
    const searchOptions: ISearchOptions = {} as ISearchOptions;
    expect(searchOptions).to.be.ok;
    done();
  });

  it("should create an ISearchResults object", (done) => {
    const searchResults: ISearchResults = {} as ISearchResults;
    expect(searchResults).to.be.ok;
    done();
  });

  it("should create an ISource object", (done) => {
    const source: ISource = {} as ISource;
    expect(source).to.be.ok;
    done();
  });

  it("should create an Status object", (done) => {
    const status: Status = Status.Unknown;
    expect(status).to.equal(Status.Unknown);
    done();
  });

  it("should create an Type object", (done) => {
    const type: Type = Type.Unknown;
    expect(type).to.equal(Type.Unknown);
    done();
  });
});
