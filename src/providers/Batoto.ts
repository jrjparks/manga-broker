import cheerio = require("cheerio");
import _ = require("lodash");
import path = require("path");
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
  "4-Koma": Genre.FourKoma,
  "Action": Genre.Action,
  "Adventure": Genre.Adventure,
  "Award Winning": Genre.AwardWinning,
  "Comedy": Genre.Comedy,
  "Cooking": Genre.Cooking,
  "Doujinshi": Genre.Doujinshi,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender Bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Historical": Genre.Historical,
  "Horror": Genre.Horror,
  "Josei": Genre.Josei,
  "Martial Arts": Genre.MartialArts,
  "Mecha": Genre.Mecha,
  "Medical": Genre.Medical,
  "Music": Genre.Music,
  "Mystery": Genre.Mystery,
  "Oneshot": Genre.Oneshot,
  "Psychological": Genre.Psychological,
  "Romance": Genre.Romance,
  "School Life": Genre.SchoolLife,
  "Sci-fi": Genre.Scifi,
  "Seinen": Genre.Seinen,
  "Shoujo": Genre.Shoujo,
  "Shoujo Ai": Genre.ShoujoAi,
  "Shounen": Genre.Shounen,
  "Shounen Ai": Genre.ShounenAi,
  "Slice of Life": Genre.SliceOfLife,
  "Smut": Genre.Smut,
  "Sports": Genre.Sports,
  "Supernatural": Genre.Supernatural,
  "Tragedy": Genre.Tragedy,
  "Webtoon": Genre.Webtoon,
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});

const AUTH_KEY = "880ea6a14ea49e853634fbdc5015a024";
export class Batoto extends ProviderCore implements ISourceProvider, IAuthentableProvider {
  public readonly is: string = "Batoto";
  public readonly baseURL: URL = new URL("https://bato.to/");
  public readonly provides: ProviderType = ProviderType.Comic;
  protected secureKey: string;

  protected authenticated: boolean = false;
  public get isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Authenticate the supplied username:password */
  public async authenticate(username: string, password: string): Promise<this> {
    if (_.isEmpty(username)) { // Error no username
      return Promise.reject(new Error("username is not supplied"));
    } else if (_.isEmpty(password)) { // Error no password
      return Promise.reject(new Error("password is not supplied"));
    } else { // Try to authenticate
      const authURL: URL = new URL("/forums/index.php", this.baseURL);
      _.forOwn({
        app: "core",
        do: "process",
        module: "global",
        section: "login",
      }, (value: string, key: string) => authURL.searchParams.set(key, value));
      const authData: string = _.transform({
        anonymous: 1,
        auth_key: AUTH_KEY,
        ips_password: (password),
        ips_username: (username),
        referer: this.baseURL.href,
        rememberMe: 1,
      }, (result, value, key) => {
        result.push([key, value].map(encodeURIComponent).join("="));
        return result;
      }, new Array<string>()).join("&");
      this.authenticated = false;
      const authRequest = await this.cloudkicker.post(authURL, authData, { Referer: this.baseURL });
      if (/username or password incorrect/i.test(authRequest.response.body.toString())) {
        throw ProviderErrors.AUTHENTICATION_INCORRECT;
      }
      return await this.cloudkicker.get(new URL("/forums", this.baseURL), { Referer: this.baseURL })
        .then(({response}) => {
          const usernameMatch = new RegExp(`Welcome,\\s${username}`);
          const cookies: string = this.cloudkicker.cookieJar.getCookieString(this.baseURL);
          const body: string = response.body.toString();
          this.authenticated = [
            /ipsconnect\w+?/,
            /member_id=\d+?/,
            /pass_hash=\w+?/,
            /session_id=\w+?/,
          ].reduce((status: boolean, regexp: RegExp) => {
            const test = regexp.test(cookies);
            return status && test;
          }, true)
            && usernameMatch.test(body);
          if (!this.authenticated) { throw ProviderErrors.UNABLE_TO_AUTHENTICATION; }
          const secKey: RegExpMatchArray = body.match(
            new RegExp("bato\\.to\\/forums\\/index\\.php\\?app\\=core.*?do\\=logout.*?k\\=(\\w+)"),
          ) as RegExpMatchArray;
          this.secureKey = secKey ? secKey[1] : "";
          return this;
        });
    }
  }

  /** Deauthenticate the current user */
  public async deauthenticate(): Promise<this> {
    if (!this.authenticated) { return Promise.resolve(this); }
    this.authenticated = false;
    if (!_.isEmpty(this.secureKey)) {
      const authURL: URL = new URL("/forums/index.php", this.baseURL);
      _.forOwn({
        app: "core",
        do: "logout",
        k: this.secureKey,
        module: "global",
        section: "login",
      }, (value: string, key: string) => authURL.searchParams.set(key, value));
      await this.cloudkicker.get(authURL);
    }
    this.cloudkicker.clearCookieJar();
    return this;
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
      const queryUrl = new URL("/search", this.baseURL);
      queryUrl.searchParams.set("name", title);
      queryUrl.searchParams.set("name_cond", "c");
      queryUrl.searchParams.set("p", (opts.page as number).toString());
      return this.cloudkicker.get(queryUrl, { Referer: queryUrl.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#comic_search_results", "table", "tbody", "tr",
            "td:nth-child(1)", "strong", "a",
          ].join(" > ");
          const nodes = $(selector);
          const results = nodes.toArray().map((node) => {
            const element = $(node);
            const name = element.text().trim();
            const value = element.attr("href").trim();
            const location = new URL(value);
            location.protocol = this.baseURL.protocol;
            const result = {
              name: (name),
              source: (location),
            };
            this.searchCache.update(name, result);
            return result;
          });
          const page: number = opts.page as number;
          const hasNextPage = Boolean($("#show_more_row > td > input").length === 1);
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
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const nameNode = $("#content > div:nth-child(4) > div > div.ipsBox_withphoto > h1");
          const name = nameNode.text().trim();

          const selector: string = [
            "#content", "div:nth-child(4)", "div", "div.ipsBox",
            "div:nth-child(1)", "div:nth-child(2)", "table", "tbody",
          ].join(" > ");
          const detailsNode = $(selector);

          const associatedNames: ISource[] = detailsNode.find("tr:nth-child(1) > td:nth-child(2) > span")
            .toArray().map((node) => {
              const element = $(node);
              const associatedName = element.text().trim();
              return {
                name: (associatedName),
                source: (source.source),
              } as ISource;
            });

          const authors: string[] = detailsNode.find("tr:nth-child(2) > td > a")
            .toArray().map((node) => {
              const element = $(node);
              return element.text().trim();
            });

          const artists: string[] = detailsNode.find("tr:nth-child(3) > td > a")
            .toArray().map((node) => {
              const element = $(node);
              return element.text().trim();
            });

          const coverSelector = [
            "#content", "div:nth-child(4)", "div", "div.ipsBox",
            "div:nth-child(1)", "div:nth-child(1)", "img",
          ].join(" > ");
          const coverNode = $(coverSelector);
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

          const statusText: string = detailsNode
            .find("tr:nth-child(6) > td:nth-child(2)").text().trim();
          const status: Status = _.get(Status, statusText, Status.Unknown);

          const typeText: string = detailsNode
            .find("tr:nth-child(5) > td:nth-child(2)")
            .text().trim().split(" ")[0];
          const type: Type = _.get(Type, typeText, Type.Unknown);

          const description = detailsNode
            .find("tr:nth-child(7) > td:nth-child(2)").text().trim();

          const genres: Genre[] = detailsNode.find("tr:nth-child(4) > td:nth-child(2) > a").toArray()
            .map((genreNode: CheerioElement) => $(genreNode).text().trim())
            .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);
          // TODO: Complete details

          return {
            about: {
              artists: (artists),
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
          };
        });
    }
  }

  public async chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#content", "div:nth-child(4)", "div", "div.clear", "div.clear",
            "div:nth-child(3)", "table", "tbody", "tr.row",
          ].join(" > ");
          const lang = "lang_English"; // Temp for language selection
          const nodes = $(selector);
          return nodes.filter(`.${lang}`).toArray()
            .reverse().reduce((chapters, node) => {
              const element = $(node);
              const sourceElement = element.find("td:nth-child(1) > a");
              const nameParts: string[] = sourceElement.text().split(":")
                .map((str) => str.trim()).filter((str) => !!(str));
              const name: string = _.last(nameParts) as string;
              const location = new URL(sourceElement.attr("href"));
              const chapterRegExp: RegExp = /(Vol\.(\d+)\s)?Ch\.(\d+(\.\d+)?)/;
              const chapterMatch: RegExpMatchArray =
                (_.first(nameParts) as string).match(chapterRegExp) as RegExpMatchArray;
              const volume = chapterMatch[2] ? parseInt(chapterMatch[2], 10) : undefined;
              const chapter = chapterMatch[3] ? parseFloat(chapterMatch[3]) : undefined;
              chapters.push({
                chapter: (chapter),
                name: (name),
                source: (location),
                volume: (volume),
              });
              return chapters;
            }, new Array<IChapter>());
        });
    }
  }

  public async pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else if (!source.source.hash) {
      throw new Error("The passed source is in an incorrect format.");
    } else if (!this.isAuthenticated) {
      throw ProviderErrors.REQUIRES_AUTHENTICATION;
    } else {
      const hashId = source.source.hash.replace(/.*#/, "");
      const getReaderURL = (id: string, page: number): URL =>
        new URL(`/areader?id=${id}&p=${page}&supress_webtoon=t`, this.baseURL);
      const URL2ISource = (url: URL): ISource => {
        return {
          name: path.basename(url.pathname),
          source: url,
        };
      };
      const firstAReaderURL = getReaderURL(hashId, 1);
      return this.cloudkicker.get(firstAReaderURL, {
        "Referer": source.source.href,
        "X-Requested-With": "XMLHttpRequest",
      }).then(({response}) => {
        const body: string = response.body.toString();

        const pageRegExp: RegExp = /http:\/\/bato\.to\/reader#\w+_\d+/g;
        const pageCount: number = new Set(body.match(pageRegExp) as RegExpMatchArray).size;
        const imageBaseRegex: RegExp = /http:\/\/img\.bato\.to\/comics\/[\w\/]*?\/read\w+\//;
        const imageBase: string = (body.match(imageBaseRegex) as RegExpMatchArray)[0];
        // This is generating the image url based on the image url in the initial page.
        return _.range(1, pageCount + 1)
          .map((page) => new URL(imageBase + `img${_.padStart(page.toString(), 6, "0")}.jpg`))
          .map(URL2ISource);
      });
    }
  }

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) {
      result = this.searchCache.bestMatch(title);
    }
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
