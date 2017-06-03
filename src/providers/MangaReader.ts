import _ = require("lodash");
import cheerio = require("cheerio");
import path = require("path");
import { URL } from "url";
import { IChapter, IDetails, ISearchResults, ISource } from "../models";

import { ICacheScoredResult, ScoredCache } from "../cache/ScoredCache";
import { ISourceProvider, ProviderCore } from "../provider";
import { StringUtil } from "../util/string";

export class MangaReader extends ProviderCore implements ISourceProvider {
  public readonly is: string = "MangaReader";
  public readonly baseURL: URL = new URL("http://www.mangareader.net");

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
    } else { return Promise.reject(new Error("This function is not supported by this provider.")); }
  }

  public chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source)
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#listing", "tr", "td:nth-child(1):has(a)",
          ].join(" > ");
          const nodes = $(selector);
          const chapterRegExp: RegExp = new RegExp(`${source.name}\\s(\\d+)\\s+:.*$`);
          return nodes.toArray().reduce((chapters, node) => {
            const element: Cheerio = $(node);
            const linkElement: Cheerio = element.find("a");
            const name = _.last(element.text().split(":").map((str) => str.trim()));
            const value = linkElement.attr("href");
            const location = new URL(this.baseURL.href);
            location.pathname = value;
            const chapterMatch: RegExpMatchArray | null = element.text().match(chapterRegExp);
            const chapter = chapterMatch ? parseInt(chapterMatch[1], 10) : undefined;
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

  public pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      const pages: ISource[] = [];
      const imageUrlToISource = (location: URL | string): ISource => {
        if (_.isString(location)) { location = new URL(location); }
        return {
          name: path.basename(location.pathname),
          source: location,
        };
      };
      return this.cloudkicker.get(source.source)
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const pageLocations: URL[] = $("#pageMenu > option")
            .toArray().map((node) => {
              const element = $(node);
              const location = new URL(this.baseURL.href);
              location.pathname = element.attr("value");
              return location;
            });
          const minimumPageLocations: URL[] = pageLocations
            .filter((location, index) => location && index % 2 === 0).slice(1);
          const imageRegExpText = StringUtil.escapeRegExp(_.first(pageLocations).href);
          const imageRegExp: RegExp = new RegExp(`${imageRegExpText.replace("www", "\\w\\d+")}/[\\w-]+\\.jpg`, "g");

          const parsePageImages = (body: any): ISource[] => {
            if (!_.isString(body)) {
              body = body.toString();
            }
            const pageImages: RegExpMatchArray | null = body.match(imageRegExp);
            if (!pageImages) {
              throw new Error(`Unable to parse images from ${source.source.href}`);
            }
            return pageImages.reverse().map(imageUrlToISource);
          };

          pages.push(...parsePageImages(response.body));

          return minimumPageLocations.reduce((chain, pageLocation) => {
            return chain.then(() => {
              return this.cloudkicker.get(pageLocation).then((cfResponse) => {
                const pageResponse = cfResponse.response;
                pages.push(...parsePageImages(pageResponse.body));
              });
            });
          }, Promise.resolve())
            .catch((error) => { throw error; });
        })
        .then(() => {
          return pages;
        });
    }
  }

  protected getSearchCache(): Promise<ScoredCache<ISource>> {
    if (!this.searchCache.isEmpty) {
      return Promise.resolve(this.searchCache);
    } else {
      const listUrl = new URL(this.baseURL.href);
      listUrl.pathname = "alphabetical";
      return this.cloudkicker.get(listUrl)
        .then(({response}) => {
          this.searchCache.clear();
          const $ = cheerio.load(response.body);
          const selector = [
            "#wrapper_body", "div", "div.series_col", "div.series_alpha",
            "ul", "li", "a",
          ].join(" > ");
          const nodes = $(selector);
          nodes.toArray().reduce((cache, node) => {
            const element = $(node);
            const key = element.text();
            const value = element.attr("href");
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
