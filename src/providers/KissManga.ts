import _ = require("lodash");
import cheerio = require("cheerio");
import { CloudKicker } from "cloudkicker";
import path = require("path");
import { URL } from "url";
import { IChapter, IDetails, ISearchResults, ISource } from "../models";

import { ICacheScoredResult } from "../cache/ScoredCache";
import { ISourceProvider, ProviderCore } from "../provider";
import { KissMangaUrlDecrypter } from "./KissMangaUrlDecrypter";

export class KissManga extends ProviderCore implements ISourceProvider {
  public readonly is: string = "KissManga";
  public readonly baseURL: URL = new URL("https://kissmanga.com");
  protected readonly urlDecrypter: KissMangaUrlDecrypter;

  constructor(cloudkicker?: CloudKicker) {
    super(cloudkicker);
    this.urlDecrypter = new KissMangaUrlDecrypter(this.baseURL, cloudkicker);
  }

  public clearCache() {
    super.clearCache();
    this.urlDecrypter.clearCache();
  }

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
            "#leftside", "div:nth-child(4)", "div.barContent.chapterList",
            "div:nth-child(2)", "table", "tr:has(td:nth-child(1) > a)",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reverse().reduce((chapters, node) => {
            const element = $(node);
            const linkElement: Cheerio = element.find("a");
            const nameParts: string[] = linkElement.text().split(":").map((str) => str.trim());
            const name = _.last(nameParts);
            const location = new URL(this.baseURL.href);
            location.pathname = linkElement.attr("href");
            const chapterMatch: RegExpMatchArray | null = _.first(nameParts).match(/\d+$/);
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

  public pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source)
        .then(({response}) => {
          const encryptedUrlRegex: RegExp = /wrapKA\(\"([\w\/\+\=]+)\"\)/g;
          const encryptedUrls: string[] = [];
          let encryptedUrlMatch = encryptedUrlRegex.exec(response.body);
          while (encryptedUrlMatch) {
            encryptedUrls.push(encryptedUrlMatch[1].trim());
            encryptedUrlMatch = encryptedUrlRegex.exec(response.body);
          }
          encryptedUrlMatch = null;
          return this.urlDecrypter.getWrapKA(response.body)
            .then((wrapKA) => Promise.all(encryptedUrls.map((encryptedUrl) => wrapKA(encryptedUrl))))
            .then((decryptedUrls) => decryptedUrls.map((decryptedUrl) => new URL(decryptedUrl)))
            .then((imageUrls) => imageUrls.map((imageUrl, index) => {
              const searchParams = imageUrl.searchParams;
              const filename: string = searchParams.get("title") || searchParams.get("url") || `page_${index}.jpg`;
              return {
                name: (path.basename(filename)),
                source: (imageUrl),
              } as ISource;
            }));
        });
    }
  }

  protected querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) {
      result = this.searchCache.bestMatch(title);
    }
    const query: boolean = this.searchCache.isEmpty || result.score < 0.9;
    if (query) {
      const queryUrl = new URL(this.baseURL.href);
      queryUrl.pathname = "/Search/Manga";
      return this.cloudkicker.post(queryUrl, `keyword=${title}`)
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#leftside", "div", "div.barContent", "div:nth-child(2)",
            "table", "tr", "td:nth-child(1)", "a",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((cache, node) => {
            const element = $(node);
            const name = element.text().trim();
            const value = element.attr("href").trim();
            const location = new URL(this.baseURL.href);
            location.pathname = value;
            return cache.update(name, {
              name: (name),
              source: (location),
            });
          }, this.searchCache);
        }).then((cache) => {
          result = cache.bestMatch(title);
          if (result.score >= 0.9) {
            return result;
          } else { throw new Error(`Title not found. Closest match: ${result.key}@${result.score}`); }
        });
    } else { return Promise.resolve(result); }
  }
}
