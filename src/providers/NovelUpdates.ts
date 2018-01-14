import cheerio = require("cheerio");
import _ = require("lodash");
// import path = require("path");
import { URL } from "url";

import { parseLinkFn } from "../util/cheerio";

import { ICacheScoredResult } from "../cache";

import {
  CoverSide,
  Genre,
  ICover,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
} from "../models";

import {
  IAuthentableProvider,
  ProviderCore,
} from "./provider";

import { ValueMapper } from "../ValueMapper";
const GenreMap: ValueMapper<Genre> = new ValueMapper<Genre>({
  "Action": Genre.Action,
  "Adult": Genre.Adult,
  "Adventure": Genre.Adventure,
  "Comedy": Genre.Comedy,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender Bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Historical": Genre.Historical,
  "Horror": Genre.Horror,
  "Josei": Genre.Josei,
  "Lolicon": Genre.Lolicon,
  "Martial Arts": Genre.MartialArts,
  "Mature": Genre.Mature,
  "Mecha": Genre.Mecha,
  "Mystery": Genre.Mystery,
  "Psychological": Genre.Psychological,
  "Romance": Genre.Romance,
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
  "Sports": Genre.Sports,
  "Supernatural": Genre.Supernatural,
  "Tragedy": Genre.Tragedy,
  "Wuxia": Genre.Wuxia,
  "Xianxia": Genre.Xianxia,
  "Xuanhuan": Genre.Xuanhuan,
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});

export class NovelUpdates extends ProviderCore implements IAuthentableProvider {
  public readonly is: string = "NovelUpdates";
  public readonly baseURL: URL = new URL("https://www.novelupdates.com/");
  public readonly provides: ProviderType = ProviderType.Database;
  protected secureKey: string;

  protected authenticated: boolean = false;
  public get isAuthenticated(): boolean {
    return this.authenticated;
  }

  public async authenticate(username: string, password: string): Promise<this> {
    if (_.isEmpty(username)) { // Error no username
      return Promise.reject(new Error("username is not supplied"));
    } else if (_.isEmpty(password)) { // Error no password
      return Promise.reject(new Error("password is not supplied"));
    } else { // Try to authenticate
      const authURL: URL = new URL("/login/", this.baseURL);
      authURL.protocol = this.baseURL.protocol;
      const authData: string = _.transform({
        "_wp_original_http_referer": this.baseURL.href,
        "action": "login",
        "instance": "",
        "log": (username),
        "pwd": (password),
        "redirect_to": new URL("/wp-admin/", this.baseURL).href,
        "rememberme": "forever",
        "wp-submit": "Log In",
      }, (result, value, key) => {
        result.push([key, value].map(encodeURIComponent).join("="));
        return result;
      }, new Array<string>()).join("&");
      this.authenticated = false;
      return this.cloudkicker.post(authURL, authData, { Referer: this.baseURL })
      .then(({response}) => {
        if (/\:\s(invalid\susername|the\spassword\syou\sentered\sfor\sthe\susername)/i
          .test(response.body.toString())) {
          return Promise.reject(new Error("Your username or password was incorrect."));
        }
        return this.cloudkicker.get(this.baseURL, { Referer: this.baseURL });
      })
      .then(({response}) => {
        const usernameMatch = new RegExp(`Welcome back,\\s\\<a.*?\\>${username}\\<\\/a\\>!`);
        const cookies: string = this.cloudkicker.cookieJar.getCookieString(this.baseURL);
        const body: string = response.body.toString();
        this.authenticated = [
          new RegExp(`wordpress_logged_in_[\\w\\_]+?=${username}[\\w\\%]`),
          new RegExp(`wordpress_\\w+?=${username}[\\w\\%]`),
        ].reduce((status: boolean, regexp: RegExp) => {
          const test = regexp.test(cookies);
          return status && test;
        }, true)
          && usernameMatch.test(body);
        if (!this.authenticated) { throw new Error("Unable to authenticate."); }
        const secKey: RegExpMatchArray = body.match(/\/logout\/\?_wpnonce\=(\w+)/) as RegExpMatchArray;
        this.secureKey = secKey ? secKey[1] : "";
        return this;
      });
    }
  }

  public async deauthenticate(): Promise<this> {
    if (!this.authenticated) { return Promise.resolve(this); }
    this.authenticated = false;
    if (!_.isEmpty(this.secureKey)) {
      const authURL: URL = new URL(`/logout/?_wpnonce=${this.secureKey}`, this.baseURL);
      authURL.protocol = this.baseURL.protocol;
      await this.cloudkicker.get(authURL);
    }
    this.cloudkicker.clearCookieJar();
    return this;
  }

  public async search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    const opts: ISearchOptions = _.extend({
      fuzzy: false,
      limit: 10,
      page: 1,
    }, options, {
      excludeNovels: false,
    });
    const queryUrl = new URL(`/page/${opts.page}/`, this.baseURL);
    queryUrl.protocol = this.baseURL.protocol;
    queryUrl.searchParams.set("s", title);
    queryUrl.searchParams.set("post_type", "seriesplans");
    return this.cloudkicker.get(queryUrl)
      .then(({response}) => {
        const $ = cheerio.load(response.body);
        const selector = [
          "body", "div.l-canvas.type_wide.col_contside.headerlayout_standard.headerpos_static",
          "div.l-main", "div", "div", "div.l-content", "div.w-blog",
          "div.w-blog-list", "div.w-blog-entry",
        ].join(" > ");
        const nodes = $(selector);
        const results = nodes.toArray().map((node) => {
          const element = $(node).find("div > a");
          const name = element.text().trim();
          const value = element.attr("href").trim();
          const location = new URL(value, this.baseURL);
          location.protocol = this.baseURL.protocol;
          const result = {
            name: (name),
            source: (location),
          };
          // Update the cache
          this.searchCache.update(name, result);
          return result;
        });
        const hasNextPage: boolean = Boolean($("a.next.page-numbers").length === 1);
        const hasPreviousPage: boolean = Boolean($("a.prev.page-numbers").length === 1);
        const pageText = $("div.digg_pagination > nav > div.nav-links > span.page-numbers.current > span").text();
        const page: number = parseInt(pageText, 10) || opts.page as number;
        return {
          hasNextPage: (hasNextPage),
          hasPreviousPage: (hasPreviousPage),
          options: (opts),
          page: (page),
          results: (results),
        } as ISearchResults;
      });
  }

  public async find(title: string): Promise<ISource> {
    return this.querySearchCache(title).then((result) => result.value as ISource);
  }

  public async details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const parseLink = parseLinkFn(this, $);

          const name: string = $([
            "body", "div.l-canvas.type_wide.col_contside.headerlayout_standard.headerpos_static",
            "div.l-main", "div", "div", "div.l-content", "div.w-blog", "div.w-blog-content",
            "div.seriestitlenu",
          ].join(" > ")).text().trim();

          const associatedNamesNode = $("#editassociated");
          const associatedNamesHtml: string | null = associatedNamesNode.html();
          if (typeof associatedNamesHtml === "string") {
            associatedNamesNode.html(associatedNamesHtml.replace("<br>", "__BR__"));
          }
          const associatedNames: ISource[] = associatedNamesNode.text().split("__BR__")
            .map((associatedName) => associatedName.trim())
            .map((associatedName) => {
              const location = source.source;
              return {
                name: (associatedName),
                source: (location),
              };
            });

          const description: string = $("#editdescription").text().trim();

          const genres: Genre[] = $("#seriesgenre > a.genre").toArray()
            .map((genreNode: CheerioElement) => $(genreNode).text().trim())
            .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);

          const coverNode: Cheerio = $("div.seriesimg > img");
          const covers: ICover[] = [];
          if (coverNode.length === 1) {
            covers.push({
              MIME: "image/jpeg",
              Normal: new URL(coverNode.attr("src").trim()),
              side: CoverSide.Front,
              volume: 0,
            });
          }

          const authors: string[] = $("#authtag")
            .toArray().map((node) => $(node).text().trim());

          const artists: string[] = $("#artiststag")
            .toArray().map((node) => $(node).text().trim());

          const recommendations: ISource[] = $("div.wpb_text_column > div > a.genre")
            .toArray().map((node) => {
              const element = $(node);
              const recommendationName = element.text().trim();
              const location = new URL(element.attr("href"), this.baseURL);
              location.protocol = this.baseURL.protocol;
              return {
                name: (recommendationName),
                source: (location),
              };
            });

          const categories: ISource[] = $("#etagme").toArray().map(parseLink)
            .filter((relatedSource) => Boolean(relatedSource)) as ISource[];

          return {
            about: {
              artists: (artists),
              associatedNames: (associatedNames),
              authors: (authors),
              categories: (categories),
              covers: (covers),
              description: (description),
              genres: (genres),
            },
            meta: {
              // categoryRecommendations: (categoryRecommendations),
              // completelyScanulated: (completelyScanulated),
              // groupsScanulating: (groupsScanulating),
              // publisher: (publisher),
              recommendations: (recommendations),
              // related: (related),
            },
            name: (name),
            source: (source.source),
          };
        });
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
        } else { throw new Error(`Title not found. Closest match: ${result.key}@${result.score}`); }
      });
    } else { return Promise.resolve(result); }
  }
}
