import cheerio = require("cheerio");
import _ = require("lodash");
// import path = require("path");
import { URL } from "url";

import {
  CoverSide,
  Genre,
  IChapter,
  ICover,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
  Status,
  Type,
} from "../models";

import {
  ICacheScoredResult,
  // ScoredCache,
} from "../cache";
// import { StringUtil } from "../util/string";
import { ValueMapper } from "../ValueMapper";
import { ProviderErrors } from "./errors";
import { ISourceProvider, ProviderCore } from "./provider";

const GenreMap: ValueMapper<Genre> = new ValueMapper<Genre>({
  "4 koma": Genre.FourKoma,
  "Action": Genre.Action,
  "Adult": Genre.Adult,
  "Adventure": Genre.Adventure,
  "Award winning": Genre.AwardWinning,
  "Comedy": Genre.Comedy,
  "Cooking": Genre.Cooking,
  "Demons": Genre.Demons,
  "Doujinshi": Genre.Doujinshi,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Historical": Genre.Historical,
  "Horror": Genre.Horror,
  "Josei": Genre.Josei,
  "Magic": Genre.Magic,
  "Martial arts": Genre.MartialArts,
  "Mature": Genre.Mature,
  "Mecha": Genre.Mecha,
  "Medical": Genre.Medical,
  "Music": Genre.Music,
  "Mystery": Genre.Mystery,
  "One shot": Genre.Oneshot,
  "Psychological": Genre.Psychological,
  "Romance": Genre.Romance,
  "School life": Genre.SchoolLife,
  "Sci fi": Genre.Scifi,
  "Seinen": Genre.Seinen,
  "Shoujo": Genre.Shoujo,
  "Shoujo ai": Genre.ShoujoAi,
  "Shounen": Genre.Shounen,
  "Shounen ai": Genre.ShounenAi,
  "Slice of life": Genre.SliceOfLife,
  "Smut": Genre.Smut,
  "Sports": Genre.Sports,
  "Supernatural": Genre.Supernatural,
  "Tragedy": Genre.Tragedy,
  "Webtoon": Genre.Webtoon,
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});
const StatusMap: ValueMapper<Status> = new ValueMapper<Status>({
  Completed: Status.Completed,
  Ongoing: Status.Ongoing,
});
const TypeMap: ValueMapper<Type> = new ValueMapper<Type>({
  "Chinese Manhua": Type.Manhua,
  "Japanese Manga": Type.Manga,
  "Korean Manhwa": Type.Manhwa,
});

export class MangaPark extends ProviderCore implements ISourceProvider {
  public readonly is: string = "MangaPark";
  public readonly baseURL: URL = new URL("https://mangapark.me");
  public readonly provides: ProviderType = ProviderType.Comic;

  public async search(title: string, options?: ISearchOptions): Promise<ISearchResults> {
    const opts: ISearchOptions = _.extend({
      excludeNovels: false,
      fuzzy: false,
      page: 1,
    }, options, {
        limit: 30,
      });
    const queryUrl = new URL("/search", this.baseURL);
    queryUrl.searchParams.set("q", title);
    queryUrl.searchParams.set("page", (opts.page as number).toString());
    if (opts.genres) {
      const genres = opts.genres.map((value) => {
        return (GenreMap.toKey(value) as string)
          .toLowerCase().replace(/\s/g, "-");
      }).join(",");
      queryUrl.searchParams.set("genres", genres);
    }
    const { response } = await this.cloudkicker.get(queryUrl, { Referer: queryUrl.href });
    const $ = cheerio.load(response.body);
    const selector = [
      "body", "section", "div", "div.manga-list", "div.item",
    ].join(" > ");
    const nodes = $(selector);
    const results = nodes.toArray().map((node) => {
      const element = $(node);
      const nameElement = element.find("h2 > a");
      const name = nameElement.text().trim();
      const value = nameElement.attr("href").trim();
      const location = new URL(value, this.baseURL);
      location.protocol = this.baseURL.protocol;
      const result = {
        name: (name),
        source: (location),
      };
      this.searchCache.update(name, result);
      return result;
    });
    let page: number = opts.page as number;
    const pagingBar = $("#paging-bar ul.paging > li:nth-child(3) > select");
    if (pagingBar) {
      let pageOption = pagingBar.find("option[selected]");
      if (pageOption.length === 0) { pageOption = pagingBar.find("option").first(); }
      page = parseInt(new URL(pageOption.val(), this.baseURL).searchParams.get("page") as string, 10);
    } else { page = 1; }

    const hasNextPage = Boolean(pagingBar.find(["#paging-bar",
      "ul:nth-child(1)", "li:nth-child(4)", "a"].join(" > ")).length === 1);
    const hasPreviousPage = Boolean(page > 1);
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
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      const { response } = await this.cloudkicker.get(source.source, { Referer: source.source.href });
      const $ = cheerio.load(response.body);

      const name: string = $("body > section > div > div:nth-child(1) > h1 > a")
        .text().replace(/Manga$/, "").trim();

      const detailsNode = $("body > section > div > table > tbody > tr > td:nth-child(2) > table > tbody");
      const associatedNames: ISource[] = detailsNode
        .find("tr:nth-child(4) > td").text()
        .split(";").map((associatedName) => {
          return {
            name: (associatedName.trim()),
            source: (source.source),
          } as ISource;
        });

      const description = detailsNode
        .find("body > section > div > p.summary").text().trim();

      const statusNode = detailsNode.find("tr:nth-child(9) > td");
      const status: Status = StatusMap.toValue(statusNode.text().trim(), Status.Unknown);

      const typeNode = detailsNode.find("tr:nth-child(8) > td");
      const type: Type = TypeMap.toValue(typeNode.text().split("-")[0].trim(), Type.Unknown);

      const authors: string[] = detailsNode.find("tr:nth-child(5) > td > a")
        .toArray().map((node) => {
          const element = $(node);
          return element.text().trim();
        });

      const artists: string[] = detailsNode.find("tr:nth-child(6) > td > a")
        .toArray().map((node) => {
          const element = $(node);
          return element.text().trim();
        });

      const genres: Genre[] = detailsNode.find("tr:nth-child(7) > td > a").toArray()
        .map((genreNode: CheerioElement) => $(genreNode).attr("title").trim())
        .map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
        .filter((genre: Genre) => genre !== Genre.Unknown);

      const coverSelector = [
        "body", "section", "div", "table", "tbody", "tr", "td:nth-child(1)",
        "div", "img",
      ].join(" > ");
      const coverNode = $(coverSelector);
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

      return {
        about: {
          artists: (artists),
          associatedNames: (associatedNames),
          authors: (authors),
          covers: (covers),
          description: (description),
          genres: (genres),
        },
        meta: {
          isNovel: false,
          status: (status),
          type: (type),
        },
        name: (name),
        source: (source.source),
      } as IDetails;
    }
  }

  public async chapters(source: ISource): Promise<IChapter[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      return [];
    }
  }

  public async pages(source: ISource): Promise<ISource[]> {
    if (source.source.host !== this.baseURL.host) {
      return Promise.reject(ProviderErrors.INCORRECT_SOURCE);
    } else {
      return [];
    }
  }

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) {
      result = this.searchCache.bestMatch(title);
    }
    const query: boolean = this.searchCache.isEmpty || result.score < 0.9;
    if (query) {
      return this.search(title).then(() => {
        result = this.searchCache.bestMatch(title);
        if (result.score >= 0.9) {
          return result;
        } else { throw ProviderErrors.CACHE_RESULT_NOT_FOUND(result); }
      });
    } else { return Promise.resolve(result); }
  }
}
