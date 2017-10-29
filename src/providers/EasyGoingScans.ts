import cheerio = require("cheerio");
import _ = require("lodash");
import path = require("path");
import { URL } from "url";

import {
  IChapter,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
} from "../models";

import { ICacheScoredResult, ScoredCache } from "../cache";
import { ProviderErrors } from "./errors";
import { ISourceProvider, ProviderCore } from "./provider";

export class EasyGoingScans extends ProviderCore implements ISourceProvider {
  public readonly is: string = "EasyGoingScans";
  public readonly baseURL: URL = new URL("http://read.egscans.com");
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
            "#omv", "table", "tbody", "tr:nth-child(2)", "td.mid", "table", "tbody",
            "tr:nth-child(1)", "td", "div", "span:nth-child(3)", "select", "option",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((chapters, node) => {
            const element = $(node);
            const name = element.text();
            const value = element.attr("value");
            const location = new URL(this.baseURL.href);
            location.pathname = value;
            const chapterMatch: RegExpMatchArray | null = name.match(/\d+$/);
            const chapter = chapterMatch ? parseInt(chapterMatch[0], 10) : undefined;
            chapters.push({
              chapter: (chapter),
              name: (name),
              source: (location),
            });
            return chapters;
          }, new Array<IChapter>());
        });
    }
  }

  public async pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      source.source.searchParams.set("display", "webtoon");
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#omv", "table", "tbody", "tr:nth-child(2)", "td.mid", "table", "tbody",
            "tr:nth-child(3)", "td", "a", "img",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((pages, node) => {
            const element = $(node);
            const src = element.attr("src");
            const location = new URL(this.baseURL.href);
            location.pathname = src;
            const name = path.basename(location.pathname);
            pages.push({
              name: (name),
              source: (location),
            });
            return pages;
          }, new Array<ISource>());
        });
    }
  }

  protected async getSearchCache(): Promise<ScoredCache<ISource>> {
    if (!this.searchCache.isEmpty) {
      return Promise.resolve(this.searchCache);
    } else {
      return this.cloudkicker.get(this.baseURL, { Referer: this.baseURL.href })
        .then(({response}) => {
          this.searchCache.clear();
          const $ = cheerio.load(response.body);
          const selector = [
            "#omv", "table", "tbody", "tr:nth-child(2)", "td.mid", "table", "tbody",
            "tr:nth-child(1)", "td", "div", "span", "select", "option",
          ].join(" > ");
          const nodes = $(selector);
          nodes.slice(1).toArray().reduce((cache, node) => {
            const element = $(node);
            const key = element.text();
            const value = element.attr("value");
            const location = new URL(this.baseURL.href);
            location.pathname = value;
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
