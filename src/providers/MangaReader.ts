import _ = require("lodash");
import cheerio = require("cheerio");
import path = require("path");
import { URL } from "url";

import { IChapter } from "../models/chapter";
import { CoverSide, ICover } from "../models/cover";
import { IDetails } from "../models/details";
import { Genre } from "../models/genre";
import { ISearchResults } from "../models/search";
import { ISource } from "../models/source";
import { Status } from "../models/status";

import { ICacheScoredResult, ScoredCache } from "../cache/ScoredCache";
import { ISourceProvider, ProviderCore } from "../provider";
import { StringUtil } from "../util/string";

export class MangaReader extends ProviderCore implements ISourceProvider {
  public readonly is: string = "MangaReader";
  public readonly baseURL: URL = new URL("http://www.mangareader.net");

  public async search(title: string, options?: any): Promise<ISearchResults> {
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

  public async details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const propertiesNode = $("#mangaproperties > table > tbody");
          const name = propertiesNode.find("tr:nth-child(1) > td:nth-child(2) > h2").text().trim();
          const associatedNames: ISource[] = propertiesNode
            .find("tr:nth-child(2) > td:nth-child(2)")
            .text().split(",").map((associatedName) => {
              return {
                name: (associatedName.trim()),
                source: (source.source),
              };
            });

          const releaseYear = parseInt(propertiesNode.find("tr:nth-child(3) > td:nth-child(2)").text(), 10);

          const statusText = propertiesNode.find("tr:nth-child(4) > td:nth-child(2)").text();
          const status: Status = _.get(Status, statusText, Status.Unknown);

          const genres: Genre[] = propertiesNode.find("tr:nth-child(8) > td:nth-child(2) > a")
            .toArray().map((genreNode) => $(genreNode).text().trim())
            .map((genre: string) => _.get(Genre, genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);

          const description = $("#readmangasum > p").text().trim();

          const coverNode = $("#mangaimg > img");
          const coverLocation = new URL(coverNode.attr("src"));
          const covers: ICover[] = coverNode ? [{
            MIME: "image/jpeg",
            Thumbnail: (coverLocation),
            side: CoverSide.Front,
            volume: 1,
          }] : [];

          return {
            about: {
              associatedNames: (associatedNames),
              covers: (covers),
              description: (description),
              genres: (genres),
              releaseYear: (releaseYear),
            },
            meta: {
              isNovel: false,
              status: (status),
            },
            name: (name),
            source: source.source,
          };
        });
    }
  }

  public async chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#listing", "tbody", "tr", "td:nth-child(1):has(a)",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((chapters, node) => {
            const element: Cheerio = $(node);
            const linkElement: Cheerio = element.find("a");
            const nameParts: string[] = element.text().split(":")
              .map((str) => str.trim()).filter((str) => !!(str));
            const name: string = _.last(nameParts) as string;
            const value = linkElement.attr("href");
            const location = new URL(this.baseURL.href);
            location.pathname = value;
            const chapterMatch: RegExpMatchArray = (_.first(nameParts) as string).match(/\d+$/) as RegExpMatchArray;
            const chapter = parseInt(chapterMatch[0], 10);
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
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      const pages: ISource[] = [];
      const imageUrlToISource = (href: string): ISource => {
        const location = new URL(href);
        return {
          name: path.basename(location.pathname),
          source: location,
        };
      };
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
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
          const imageRegExpText = StringUtil.escapeRegExp((_.first(pageLocations) as URL).href);
          const imageRegExp: RegExp = new RegExp(`${imageRegExpText.replace("www", "\\w\\d+")}/[\\w-]+\\.jpg`, "g");

          const parsePageImages = (body: any): ISource[] => {
            if (!_.isString(body)) { body = body.toString(); }
            const pageImages: RegExpMatchArray | null = body.match(imageRegExp);
            if (!pageImages) { throw new Error(`Unable to parse images from ${source.source.href}`); }
            return pageImages.reverse().map(imageUrlToISource);
          };

          return minimumPageLocations.reduce((chain, pageLocation) => {
            return chain.then(() => this.cloudkicker
              .get(pageLocation, { Referer: pageLocation.href })
              .then((cf) => pages.push(...parsePageImages(cf.response.body))));
          }, Promise.resolve(pages.push(...parsePageImages(response.body))))
          .catch((error: Error) => { throw error; });
        }).then(() => pages);
    }
  }

  protected async getSearchCache(): Promise<ScoredCache<ISource>> {
    if (!this.searchCache.isEmpty) {
      return Promise.resolve(this.searchCache);
    } else {
      const listUrl = new URL(this.baseURL.href);
      listUrl.pathname = "alphabetical";
      return this.cloudkicker.get(listUrl, { Referer: listUrl.href })
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

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    return this.getSearchCache()
      .then((cache) => new Promise<ICacheScoredResult<ISource>>((resolve, reject) => {
        const result = cache.bestMatch(title);
        if (result.score >= 0.9) {
          return resolve(result);
        } else { return reject(new Error(`Title not found. Closest match: ${result.key}@${result.score}`)); }
      }));
  }
}
