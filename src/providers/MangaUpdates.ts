import cheerio = require("cheerio");
import _ = require("lodash");
import { URL } from "url";

import { parseLinkFn } from "../util/cheerio";

import {
  CoverSide,
  Genre,
  ICover,
  IDetails,
  IPublisher,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
  Status,
  Type,
} from "../models";

import { ICacheScoredResult } from "../cache";
import { ValueMapper } from "../ValueMapper";
import { IProvider, ProviderCore } from "./provider";

const GenreMap: ValueMapper<Genre> = new ValueMapper<Genre>({
  "Action": Genre.Action,
  "Adult": Genre.Adult,
  "Adventure": Genre.Adventure,
  "Comedy": Genre.Comedy,
  "Doujinshi": Genre.Doujinshi,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender Bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Hentai": Genre.Hentai,
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
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});

export class MangaUpdates extends ProviderCore implements IProvider {
  public readonly is: string = "MangaUpdates";
  public readonly baseURL: URL = new URL("https://www.mangaupdates.com");
  public readonly provides: ProviderType = ProviderType.Database;

  public async search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    const opts: ISearchOptions = _.extend({
      excludeNovels: true,
      fuzzy: false,
      limit: 100,
      page: 1,
    }, options);
    const searchParams: { [key: string]: any } = {
      page: opts.page,
      perpage: opts.limit,
      search: (opts.fuzzy ? title : `"${title}"`).replace(/\"+/g, "\""),
      stype: "title",
    };
    const queryURL = new URL(this.baseURL.href);
    queryURL.pathname = "/series.html";
    _.forOwn(searchParams, (value, key) => {
      if (value) {
        queryURL.searchParams.set(key.toString(), value.toString());
      }
    });

    const {response} = await this.cloudkicker.get(queryURL, { Referer: queryURL.href });
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
          .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
          .filter((genre: Genre) => genre !== Genre.Unknown);
        const location = new URL(titleNode.attr("href"));
        const id = parseInt(location.searchParams.get("id") as string, 10);
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
    if (opts && opts.excludeNovels) {
      results = results.filter((result) => !(result.meta && result.meta.isNovel));
    }
    if (results.length === 0) { throw new Error("Title not found."); }
    return {
      hasNextPage: (hasNextPage),
      hasPreviousPage: (hasPreviousPage),
      options: (opts),
      page: (page),
      results: (results),
    } as ISearchResults;
  }

  public async find(title: string): Promise<ISource> {
    return this.querySearchCache(title).then((result) => result.value as ISource);
  }

  public async details(source: ISource): Promise<IDetails> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      const {response} = await this.cloudkicker.get(source.source, { Referer: source.source.href });
      const $ = cheerio.load(response.body);
      const parseLink = parseLinkFn(this, $);

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

      // Related
      const relatedNodes = contentNode.find("div:nth-child(3) > div > div:nth-child(8) > a");
      const related: ISource[] = relatedNodes.toArray().map(parseLink)
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
      const groupsScanulating = groupsScanulatingNodes.toArray().map(parseLink)
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
        .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
        .filter((genre: Genre) => genre !== Genre.Unknown);

      const categories = contentNode.find("#ajax_tag_data > ul > li > a")
        .toArray().map(parseLink)
        .filter((categorySource) => Boolean(categorySource)) as ISource[];

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
          categories: (categories),
          covers: (covers),
          description: (description),
          genres: (genres),
          releaseYear: (releaseYear),
          status: (status),
          type: (type),
        },
        meta: {
          categoryRecommendations: (categoryRecommendations),
          completelyScanulated: (completelyScanulated),
          groupsScanulating: (groupsScanulating),
          publisher: (publisher),
          recommendations: (recommendations),
          related: (related),
        },
        name: (name),
        source: (source.source),
      } as IDetails;
    }
  }

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) { result = this.searchCache.bestMatch(title); }
    const query: boolean = this.searchCache.isEmpty || result.score < 0.9;
    if (query) {
      await this.search(title);
      result = this.searchCache.bestMatch(title);
      if (result.score >= 0.9) {
        return result;
      } else { throw new Error(`Title not found. Closest match: ${result.key}@${result.score}`); }
    } else { return Promise.resolve(result); }
  }
}
