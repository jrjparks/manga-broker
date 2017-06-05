import _ = require("lodash");
import cheerio = require("cheerio");
import { URL } from "url";

import { CoverSide, ICover } from "../models/cover";
import { IDetails } from "../models/details";
import { Genre } from "../models/genre";
import { IPublisher } from "../models/publisher";
import { ISearchOptions, ISearchResults } from "../models/search";
import { ISource } from "../models/source";
import { Status } from "../models/status";
import { Type } from "../models/type";

import { ICacheScoredResult } from "../cache/ScoredCache";
import { IProvider, ProviderCore } from "../provider";

export class MangaUpdates extends ProviderCore implements IProvider {
  public readonly is: string = "MangaUpdates";
  public readonly baseURL: URL = new URL("https://www.mangaupdates.com");

  public search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    options = _.extend({
      excludeNovels: true,
      fuzzy: false,
      limit: 100,
      page: 1,
    }, options || {});
    const searchParams: { [key: string]: any } = {
      page: options.page,
      perpage: options.limit,
      search: (options.fuzzy ? title : `"${title}"`).replace(/\"+/g, "\""),
      stype: "title",
    };
    const queryURL = new URL(this.baseURL.href);
    queryURL.pathname = "/series.html";
    _.mapKeys(searchParams, (value, key) => queryURL.searchParams.set(key, value));

    return this.querySearchCache(title)
      .then(({value}) => {
        return {
          hasNextPage: false,
          hasPreviousPage: false,
          options: (options),
          page: 1,
          results: [value],
        } as ISearchResults;
      })
      .catch(() => this.cloudkicker.get(queryURL)
        .then(({response}) => {
          const $ = cheerio.load(response.body);

          const pageSelector: string = [
            "#main_content", "div", "table", "tbody", "tr:nth-last-child(4)", "td",
            "table:nth-child(1)", "tr",
          ].join(" > ");
          const pageNodes = $(pageSelector);
          const prevPageNode = pageNodes.find("td:nth-child(1) > a");
          const currPageNode = pageNodes.find("td:nth-child(2) > b > font");
          const nextPageNode = pageNodes.find("td:nth-child(3) > a");
          const hasPreviousPage: boolean = Boolean(prevPageNode.length);
          const page = currPageNode ? parseInt(currPageNode.text(), 10) : 1;
          const hasNextPage: boolean = Boolean(nextPageNode.length);

          let results: IDetails[] = $("#main_content > div > table").find("tr:has(td.text.pad)")
            .toArray().map((node): IDetails => {
              const element = $(node);
              const titleNode = element.find("td:nth-child(1) > a");
              const name = titleNode.text();
              const isNovel = name.endsWith("(Novel)");
              const genres: Genre[] = element.find("td:nth-child(2)").text()
                .split(",").map((genre: string) => genre.trim())
                .map((genre: string) => _.get(Genre, genre, Genre.Unknown))
                .filter((genre: Genre) => genre !== Genre.Unknown);
              const location = new URL(titleNode.attr("href"));
              const id = parseInt(location.searchParams.get("id") || "-1", 10);
              const releaseYear = parseInt(element.find("td:nth-child(3)").text(), 10);
              const rating = parseInt(element.find("td:nth-child(4)").text(), 10);
              const result: IDetails = {
                about: {
                  genres: (genres),
                  rating: (rating),
                  releaseYear: (releaseYear),
                },
                meta: {
                  isNovel: (isNovel),
                },
                name: (name),
                source: (location),
              };
              if (id >= 0) { this.searchCache.update(name, result); }
              return result;
            });
          if (options && options.excludeNovels) {
            results = results.filter((result) => !(result.meta && result.meta.isNovel));
          }
          if (results.length === 0) { throw new Error("Title not found."); }
          return {
            hasNext: (hasNextPage),
            hasPrev: (hasPreviousPage),
            options: (options),
            page: (page),
            results: (results),
          };
        }));
  }

  public details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source)
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          // const parseLink = (node: any, param: string): ISource | undefined => {
          const parseLink = (node: CheerioElement): ISource | undefined => {
            const element = $(node);
            if (element.length !== 1) {
              return undefined;
            } else {
              const name = element.text().trim();
              const href = element.attr("href");
              if (href.includes("javascript:")) {
                return undefined;
              } else {
                const location: URL = new URL(href.includes("://") ? href : `${this.baseURL}/${href}`);
                // const value: string | null = location.searchParams.get(param);
                return {
                  name: (name),
                  source: (location),
                };
              }
            }
          };
          const parseLinkBind: (node: CheerioElement) => ISource | undefined = parseLink.bind(this);

          // Series Content Node
          const contentNode = $("#main_content > table.series_content_table > tbody > tr > td > div:nth-child(1)");

          // Type
          const typeNode = contentNode.find("div:nth-child(3) > div > div:nth-child(5)");
          const type: Type = _.get(Type, typeNode.text().trim(), Type.Unknown);

          // Name
          const nameNode = contentNode.find("div:nth-child(1) > span.releasestitle.tabletitle");
          const name = nameNode.text().trim();

          // Description
          const descriptionNode = contentNode.find("div:nth-child(3) > div > div:nth-child(2)");
          const description = descriptionNode.text().trim();

          // Cover
          const coverNode = contentNode.find("div:nth-child(4) > div > div:nth-child(2) > center > img");
          const covers: ICover[] = coverNode.length === 1 ? [{
            MIME: "image/jpeg",
            Normal: new URL(coverNode.attr("src").trim()),
            side: CoverSide.Front,
            volume: 0,
          }] : [];

          // Related
          const relatedNodes = contentNode.find("div:nth-child(3) > div > div:nth-child(8) > a");
          const related: ISource[] = relatedNodes.toArray()
            .map((node) => parseLinkBind(node))
            .filter((relatedSource) => Boolean(relatedSource)) as ISource[];

          // Associated Names
          const associatedNamesNode = contentNode.find("div:nth-child(3) > div > div:nth-child(11)");
          const associatedNames: ISource[] = associatedNamesNode.children().toArray()
            .map((node) => {
              const element = $(node);
              const associatedName = element.text().trim();
              const location = new URL(this.baseURL.href);
              location.pathname = element.attr("href");
              return {
                name: (associatedName),
                source: (location),
              };
            });

          // Groups Scanulating
          const groupsScanulatingNodes = contentNode.find("div:nth-child(3) > div > div:nth-child(14) > a");
          const groupsScanulating = groupsScanulatingNodes.toArray()
            .map((node) => parseLinkBind(node))
            .filter((groupsScanulatingSource) => Boolean(groupsScanulatingSource)) as ISource[];

          // Status
          const statusNode = contentNode.find("div:nth-child(3) > div > div:nth-child(20)");
          const status: Status = _.get(Status, statusNode.text().trim(), Status.Unknown);

          // Completely Scanulated
          const completelyScanulatedNode = contentNode.find("div:nth-child(3) > div > div:nth-child(23)");
          const completelyScanulated = completelyScanulatedNode.text().trim().toLowerCase() === "yes";

          // Genres
          const genres: Genre[] = contentNode.find("div:nth-child(4) > div > div:nth-child(5) > a:has(>u)").toArray()
            .map((node) => $(node).text().trim())
            .map((genre: string) => _.get(Genre, genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);

          const categories = contentNode.find("#ajax_tag_data > ul > li > a")
            .toArray().map((node) => $(node).text().trim());

          const categoryRecommendations: ISource[] = contentNode.find("div:nth-child(4) > div > div:nth-child(11) > a")
            .toArray().map((node) => {
              const element = $(node);
              const categoryRecommendation = element.text().trim();
              const location = new URL(element.attr("href"), this.baseURL.href);
              return {
                name: (categoryRecommendation),
                source: (location),
              };
            });

          let recommendationsNode: Cheerio = contentNode.find("#div_recom_more > div > a");
          if (recommendationsNode.length === 0) { recommendationsNode = contentNode.find("#div_recom_link > a"); }
          const recommendations: ISource[] = recommendationsNode.toArray().map((node) => {
            const element = $(node);
            const recommendation = element.text().trim();
            const location = new URL(element.attr("href"), this.baseURL.href);
            return {
              name: (recommendation),
              source: (location),
            };
          });

          const authors: string[] = contentNode.find("div:nth-child(4) > div > div:nth-child(17) > a")
            .toArray().map((node) => $(node).text().trim());

          const artists: string[] = contentNode.find("div:nth-child(4) > div > div:nth-child(20) > a")
            .toArray().map((node) => $(node).text().trim());

          const releaseYear: number =
            parseInt(contentNode.find("div:nth-child(4) > div > div:nth-child(23)").text(), 10);

          const publisherSourceNode = contentNode.find("div:nth-child(4) > div > div:nth-child(26) > a");
          const publisherSource: ISource = {
            name: publisherSourceNode.text().trim(),
            source: new URL(publisherSourceNode.attr("href"), this.baseURL),
          };
          const magazineSourceNode = contentNode.find("div:nth-child(4) > div > div:nth-child(29) > a");
          const magazineSource: ISource = {
            name: magazineSourceNode.text().trim(),
            source: new URL(magazineSourceNode.attr("href"), this.baseURL),
          };
          const englishLicensed = contentNode.find("div:nth-child(4) > div > div:nth-child(32)")
            .text().trim().toLowerCase() === "Yes";
          const englishPublisherSourceNode = contentNode.find("div:nth-child(4) > div > div:nth-child(35) > a");
          const englishPublisherSource: ISource = {
            name: englishPublisherSourceNode.text().trim(),
            source: new URL(englishPublisherSourceNode.attr("href"), this.baseURL),
          };
          const publisher: IPublisher = {
            englishPublisher: (englishPublisherSource),
            licensed: (englishLicensed),
            magazine: (magazineSource),
            publisher: (publisherSource),
          };

          // TODO: Complete MangaUpdates details
          return {
            about: {
              artists: (artists),
              associatedNames: (associatedNames),
              authors: (authors),
              covers: (covers),
              description: (description),
              genres: (genres),
              releaseYear: (releaseYear),
              status: (status),
              type: (type),
            },
            meta: {
              categories: (categories),
              categoryRecommendations: (categoryRecommendations),
              completelyScanulated: (completelyScanulated),
              groupsScanulating: (groupsScanulating),
              publisher: (publisher),
              recommendations: (recommendations),
              related: (related),
            },
            name: (name),
            source: (source.source),
          };
        });
    }
  }

  protected querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    return new Promise((resolve, reject) => {
      const result = this.searchCache.bestMatch(title);
      if (result.score >= 0.9) {
        return resolve(result);
      } else { return reject(new Error(`Title not found. Closest match: ${result.key}@${result.score}`)); }
    });
  }
}
