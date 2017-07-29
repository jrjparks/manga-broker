import _ = require("lodash");
import cheerio = require("cheerio");
// import path = require("path");
import { URL } from "url";

import {
  CoverSide,
  Genre,
  IChapter,
  ICover,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
  Status,
  Type,
} from "../models";

import { ICacheScoredResult } from "../cache";
import { ValueMapper } from "../ValueMapper";
import { ProviderErrors } from "./errors";
import { IAuthentableProvider, ISourceProvider, ProviderCore } from "./provider";

const GenreMap: ValueMapper<Genre> = new ValueMapper<Genre>({
  "Action": Genre.Action,
  "Adult": Genre.Adult,
  "Adventure": Genre.Adventure,
  "Comedy": Genre.Comedy,
  "Doujinshi": Genre.Doujinshi,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender Bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Hentai": Genre.Hentai,
  "Historical": Genre.Historical,
  "History": Genre.Historical,
  "Horror": Genre.Horror,
  "Josei": Genre.Josei,
  "Life": Genre.SliceOfLife,
  "Lolicon": Genre.Lolicon,
  "Magic": Genre.Magic,
  "Martial Arts": Genre.MartialArts,
  "Mature": Genre.Mature,
  "Mecha": Genre.Mecha,
  "Music": Genre.Music,
  "Mystery": Genre.Mystery,
  "One Shot": Genre.Oneshot,
  "Psychological": Genre.Psychological,
  "Romance": Genre.Romance,
  "School": Genre.SchoolLife,
  "School Life": Genre.SchoolLife,
  "Sci-fi": Genre.Scifi,
  "Seinen": Genre.Seinen,
  "Shotacon": Genre.Shotacon,
  "Shoujo": Genre.Shoujo,
  "Shoujo Ai": Genre.ShoujoAi,
  "Shounen": Genre.Shounen,
  "Shounen Ai": Genre.ShounenAi,
  "Slice of Life": Genre.SliceOfLife,
  "Smut": Genre.Smut,
  "Sport": Genre.Sports,
  "Sports": Genre.Sports,
  "Super Power": Genre.SuperPower,
  "Supernatural": Genre.Supernatural,
  "Tragedy": Genre.Tragedy,
  "Webtoon": Genre.Webtoon,
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});
const StatusMap: ValueMapper<Status> = new ValueMapper<Status>({
  Completed: Status.Completed,
  Ongoing: Status.Ongoing,
});
const TypeMap: ValueMapper<Type> = new ValueMapper<Type>({
  Manga: Type.Manga,
  Manhua: Type.Manhua,
  Manhwa: Type.Manhwa,
  Novel: Type.Novel,
});

export class MangaTraders extends ProviderCore implements ISourceProvider, IAuthentableProvider {
  public readonly is: string = "MangaTraders";
  public readonly baseURL: URL = new URL("https://mangatraders.biz");
  public readonly provides: ProviderType = ProviderType.Comic;

  protected authenticated: boolean = false;
  public get isAuthenticated(): boolean {
    return this.authenticated;
  }

  public async authenticate(username: string, password: string): Promise<this> {
    const authURL: URL = new URL("/auth/process.login.php", this.baseURL);
    const authData: string = _.transform({
      EmailAddress: (username),
      Password: (password),
      RememberMe: 1,
    }, (result, value, key) => {
      result.push([key, value].map(encodeURIComponent).join("="));
      return result;
    }, new Array<string>()).join("&");
    const authRequest = await this.cloudkicker.post(authURL, authData, { Referer: this.baseURL });
    this.authenticated = authRequest.response.statusCode === 200;
    if (!this.authenticated) { throw ProviderErrors.UNABLE_TO_AUTHENTICATION; }
    return this;
  }

  public async deauthenticate(): Promise<this> {
    if (!this.authenticated) {
      return this;
    } else {
      this.authenticated = false;
      const authURL: URL = new URL("/logout.php", this.baseURL);
      await this.cloudkicker.get(authURL);
      this.cloudkicker.clearCookieJar();
      return this;
    }
  }

  public async search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      const opts: ISearchOptions = _.extend({
        excludeNovels: false,
        fuzzy: false,
        limit: 10,
        page: 1,
      }, options);
      const queryUrl = new URL("/search/request.php", this.baseURL);
      const queryData: string = _.transform({
        author: "",
        genre: "",
        genreNo: "",
        keyword: (title),
        page: (opts.page),
        pstatus: "",
        sortBy: "",
        sortOrder: "",
        status: "",
        type: "",
        year: "",
      }, (result, value, key) => {
        result.push([key, value].map(encodeURIComponent).join("="));
        return result;
      }, new Array<string>()).join("&");

      return this.cloudkicker.post(queryUrl, queryData, { Referer: queryUrl.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "div.requested", "div", "div.col-xs-8", "a",
          ].join(" > ");
          const nodes = $(selector);
          const results = nodes.toArray().map((node) => {
            const element = $(node);
            const name = element.text().trim();
            const value = element.attr("href").trim();
            const location = new URL(value, this.baseURL);
            location.protocol = this.baseURL.protocol;
            const result = {
              name: (name),
              source: (location),
            };
            this.searchCache.update(name, result);
            return result;
          });
          const page: number = opts.page as number;
          const hasNextPage = Boolean($("button.requestMore").length === 1);
          const hasPreviousPage = Boolean(page > 1);
          return {
            hasNextPage: (hasNextPage),
            hasPreviousPage: (hasPreviousPage),
            options: (opts),
            page: (page),
            results: (results),
          } as ISearchResults;
        });
    }
  }

  public async find(title: string): Promise<ISource> {
    if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      return this.querySearchCache(title).then((result) => result.value as ISource);
    }
  }

  public async details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      return this.cloudkicker.get(source.source)
        .then(({response}) => {
          const $: CheerioStatic = cheerio.load(response.body);

          const selector: string = [
            "body", "div.container.mainContainer", "div", "div.row",
            "div.col-lg-9.col-md-9.col-sm-9.col-xs-12", "span",
          ].join(" > ");
          const detailsNode = $(selector);

          const name: string = $("div.series-title > h1").text().trim();

          const description: string = detailsNode.find("div.description").text().trim();

          const associatedNames: ISource[] = [];

          const authors: string[] = [];

          const genres: Genre[] = detailsNode.find("div:nth-child(7) > div > a").toArray()
            .map((genreNode: CheerioElement) => $(genreNode).text().trim())
            .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);

          const statusNode = detailsNode.find("div:nth-child(13) > div > a:nth-child(2)");
          const statusValue: string = (statusNode.text().match(/\((\w+)\)/) as RegExpMatchArray)[0];
          const status: Status = StatusMap.toValue(statusValue, Status.Unknown);

          const typeNode = detailsNode.find("div:nth-child(9) > div > a");
          const type: Type = TypeMap.toValue(typeNode.text().trim(), Type.Unknown);

          const coverNode = $("body > div.container.mainContainer > div > div.row > div.leftImage > img");
          const covers: ICover[] = [];
          if (coverNode.length === 1) {
            const coverLocation = new URL(coverNode.attr("src"));
            covers.push({
              MIME: "image/jpeg",
              Thumbnail: (coverLocation),
              side: CoverSide.Front,
              volume: 1,
            });
          }

          return {
            about: {
              // artists: (artists),
              associatedNames: (associatedNames),
              authors: (authors),
              covers: (covers),
              description: (description),
              genres: (genres),
            },
            meta: {
              isNovel: false,
              status: (status),
              type: (type),
            },
            name: (name),
            source: (source.source),
          } as IDetails;
        });
    }
  }

  public async chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      throw ProviderErrors.FUNCTION_NOT_IMPLEMENTED;
    }
  }

  public async pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      throw ProviderErrors.FUNCTION_NOT_IMPLEMENTED;
    }
  }

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) { result = this.searchCache.bestMatch(title); }
    const query: boolean = this.searchCache.isEmpty || result.score < 0.9;
    if (query) {
      return this.search(title).then(() => {
        result = this.searchCache.bestMatch(title);
        if (result.score >= 0.9) {
          return result;
        } else { throw ProviderErrors.CACHE_RESULT_NOT_FOUND(result); }
      });
    } else { return Promise.resolve(result); }
  }
}
