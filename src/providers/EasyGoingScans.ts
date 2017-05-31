import cheerio = require("cheerio");
import path = require("path");
import { URL } from "url";
import { IChapter, IDetails, ISearchResults, ISource } from "../models";

import { ICacheScoredResult, ScoredCache } from "../cache/ScoredCache";
import { ISourceProvider, ProviderCore } from "../provider";

export class EasyGoingScans extends ProviderCore implements ISourceProvider {
  public readonly is: string = "EasyGoingScans";
  public readonly baseURL: URL = new URL("http://read.egscans.com");

  public search(title: string, options?: any): Promise<ISearchResults> {
    return this.querySearchCache(title)
      .then((result) => {
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          options: (options),
          page: 1,
          results: [result.value],
        } as ISearchResults;
      });
  }

  public details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    }
    return Promise.reject(new Error("This function has not been implemented."));
  }

  public chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    }
    return this.cloudkicker.get(source.source)
      .then(({response}) => {
        const $ = cheerio.load(response.body);
        const selector = [
          "#omv", "table", "tr:nth-child(2)", "td.mid", "table",
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

  public pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    }
    source.source.searchParams.set("display", "webtoon");
    return this.cloudkicker.get(source.source)
      .then(({response}) => {
        const $ = cheerio.load(response.body);
        const selector = [
          "#omv", "table", "tr:nth-child(2)", "td.mid", "table",
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

  protected getSearchCache(): Promise<ScoredCache<ISource>> {
    if (!this.searchCache.isEmpty) {
      return Promise.resolve(this.searchCache);
    } else {
      return this.cloudkicker.get(this.baseURL.href)
        .then(({response}) => {
          this.searchCache.clear();
          const $ = cheerio.load(response.body);
          const selector = [
            "#omv", "table", "tr:nth-child(2)", "td.mid", "table",
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

  protected querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    return this.getSearchCache()
      .then((cache) => new Promise((resolve, reject) => {
        const result = cache.bestMatch(title);
        if (result.score >= 0.9) {
          return resolve(result);
        } else { return reject(new Error(`Title not found. Closest match: ${result.key}@${result.score}`)); }
      }));
  }
}
