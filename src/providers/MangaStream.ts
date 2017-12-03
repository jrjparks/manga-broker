import _ = require("lodash");
import cheerio = require("cheerio");
import path = require("path");
import { URL } from "url";

import {
  // CoverSide,
  // Genre,
  IChapter,
  // ICover,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
  // Status,
  // Type,
} from "../models";

import {
  ICacheScoredResult,
  ScoredCache,
} from "../cache";
// import { StringUtil } from "../util/string";
// import { ValueMapper } from "../ValueMapper";
import { ProviderErrors } from "./errors";
import { ISourceProvider, ProviderCore } from "./provider";

export class MangaStream extends ProviderCore implements ISourceProvider {
  public readonly is: string = "MangaStream";
  public readonly baseURL: URL = new URL("https://readms.net/");
  public readonly provides: ProviderType = ProviderType.Comic;

  public async search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    const opts: ISearchOptions = _.extend({
      fuzzy: false,
    }, options, {
      excludeNovels: true,
      limit: 30,
      page: 1,
    });
    return this.querySearchCache(title)
      .then((result) => {
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          options: (opts),
          page: 1,
          results: [result.value],
        } as ISearchResults;
      });
  }

  public async find(title: string): Promise<ISource> {
    return this.querySearchCache(title).then((result) => result.value as ISource);
  }

  public async details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else { return Promise.reject(ProviderErrors.FUNCTION_NOT_SUPPORTED); }
  }

  public async chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "body", "div.container.main-body", "div.row.content",
            "div.col-sm-8", "table", "tbody", "tr",
            "td:nth-child(1)", "a",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((chapters, node) => {
            const element = $(node);
            const nameParts: string[] = element.text().split("-")
              .map((str) => str.trim()).filter((str) => !!(str));
            const name: string = _.last(nameParts) as string;
            const location = new URL(element.attr("href"), this.baseURL.href);
            const chapterMatch: RegExpMatchArray | null = (_.first(nameParts) as string).match(/^[\d.]+/);
            const chapter = chapterMatch ? parseFloat(chapterMatch[0]) : undefined;
            chapters.push({
              chapter: (chapter),
              name: (name),
              source: (location),
            });
            return chapters;
          }, new Array<IChapter>()).reverse();
        });
    }
  }

  public async pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      const URL2ISource = (url: URL): ISource => {
        return {
          name: path.basename(url.pathname),
          source: url,
        };
      };
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
      .then(({response}) => {
        const $ = cheerio.load(response.body);
        const body: string = response.body.toString();

        const pageRegExp: RegExp = /(\/\/img\.(readms|mangastream)\.(net|com)\/cdn\/manga\/\d+\/\d+\/)(\d+)\.(\w{3,4})/;
        const initImage: RegExpMatchArray | null = body.match(pageRegExp);
        if (initImage) {
          const imageHref: string = initImage[0].replace(/^\/\//, `${this.baseURL.protocol}//`);
          const lastPageElement = $([
            "body", "div.main-body", "div.subnav", "div", "div",
            "div.btn-group.btn-reader-page", "ul", "li", "a",
          ].join(" > ")).last();
          const lastPageNumber: string = (lastPageElement.attr("href").match(/\/(\d+)$/) as RegExpMatchArray)[1];
          const pageCount: number = parseInt(lastPageNumber, 10);
          // This is generating the image url based on the image url in the initial page.
          return _.range(1, pageCount + 1)
            .map((page) => new URL(
              imageHref.replace(
                pageRegExp,
                (_1, imgPath, _2, _3, _4, ext) => `${imgPath}${_.padStart(page.toString(), 2, "0")}.${ext}`)))
            .map(URL2ISource);
        } else {
          throw Error("Unable to locate image.");
        }
      });
    }
  }

  protected async getSearchCache(): Promise<ScoredCache<ISource>> {
    if (!this.searchCache.isEmpty) {
      return Promise.resolve(this.searchCache);
    } else {
      const mangaDirectoryUrl = new URL("/manga", this.baseURL);
      return this.cloudkicker.get(mangaDirectoryUrl, { Referer: this.baseURL.href })
        .then(({response}) => {
          this.searchCache.clear();
          const $ = cheerio.load(response.body);
          const selector = [
            "body", "div.container.main-body", "div.row.content",
            "div.col-sm-8", "table", "tbody", "tr",
            "td:nth-child(1)", "strong", "a",
          ].join(" > ");
          const nodes = $(selector);
          nodes.slice(1).toArray().reduce((cache, node) => {
            const element = $(node);
            const key = element.text();
            const location = new URL(element.attr("href"), this.baseURL.href);
            return cache.update(key, {
              name: (key),
              source: (location),
            });
          }, this.searchCache);
          return this.searchCache;
        });
    }
  }

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    return this.getSearchCache()
      .then((cache) => {
        const result = cache.bestMatch(title);
        if (result.score >= 0.9) {
          return result;
        } else { throw ProviderErrors.CACHE_RESULT_NOT_FOUND(result); }
      });
  }
}
