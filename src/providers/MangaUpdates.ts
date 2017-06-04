import _ = require("lodash");
import cheerio = require("cheerio");
import { URL } from "url";
import { CoverSide, Genre, ICover, IDetails, ISearchOptions, ISearchResults, ISource, Type } from "../models";

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
                .filter((genre: string) => !genre.endsWith("..."))
                .map((genre: keyof typeof Genre) => Genre[genre]);
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
          const typeKey: keyof typeof Type = typeNode.text().trim() as keyof typeof Type;
          const type: Type = Type[typeKey];

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
          const associatedNames = associatedNamesNode.children().toArray()
            .map((node) => (node.prev as any).data.trim());

          // Groups Scanulating
          const groupsScanulatingNodes = contentNode.find("div:nth-child(3) > div > div:nth-child(14) > a");
          const groupsScanulating = groupsScanulatingNodes.toArray()
            .map((node) => parseLinkBind(node))
            .filter((groupsScanulatingSource) => Boolean(groupsScanulatingSource)) as ISource[];

          // TODO: Complete MangaUpdates details
          return {
            about: {
              associatedNames: (associatedNames),
              covers: (covers),
              description: (description),
              type: (type),
            },
            meta: {
              categoryRecommendations: [],
              groupsScanulating: (groupsScanulating),
              recommendations: [],
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
