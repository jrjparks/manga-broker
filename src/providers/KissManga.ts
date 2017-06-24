import _ = require("lodash");
import cheerio = require("cheerio");
import { CloudKicker } from "cloudkicker";
import path = require("path");
import { URL } from "url";
import vm = require("vm");

import {
  CoverSide,
  Genre,
  IChapter,
  ICover,
  IDetails,
  ISearchResults,
  ISource,
  ProviderType,
  Status,
  Type,
} from "../models";

import { ICacheScoredResult } from "../cache";
import { ISourceProvider, ProviderCore } from "../provider";
import { stringEnum } from "../StringEnum";
import { ValueMapper } from "../ValueMapper";

const TypeMap: ValueMapper<Type> = new ValueMapper<Type>({
  Manga: Type.Manga,
  Manhua: Type.Manhua,
  Manhwa: Type.Manhwa,
});
const GenreMap: ValueMapper<Genre> = new ValueMapper<Genre>({
  "4-Koma": Genre.FourKoma,
  "Action": Genre.Action,
  "Adult": Genre.Adult,
  "Adventure": Genre.Adventure,
  "Comedy": Genre.Comedy,
  "Comic": Genre.Comic,
  "Cooking": Genre.Cooking,
  "Doujinshi": Genre.Doujinshi,
  "Drama": Genre.Drama,
  "Ecchi": Genre.Ecchi,
  "Fantasy": Genre.Fantasy,
  "Gender Bender": Genre.GenderBender,
  "Harem": Genre.Harem,
  "Historical": Genre.Historical,
  "Horror": Genre.Horror,
  "Josei": Genre.Josei,
  "Lolicon": Genre.Lolicon,
  "Martial Arts": Genre.MartialArts,
  "Mature": Genre.Mature,
  "Mecha": Genre.Mecha,
  "Medical": Genre.Medical,
  "Music": Genre.Music,
  "Mystery": Genre.Mystery,
  "One shot": Genre.Oneshot,
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
  "Webtoon": Genre.Webtoon,
  "Yaoi": Genre.Yaoi,
  "Yuri": Genre.Yuri,
});

export class KissManga extends ProviderCore implements ISourceProvider {
  public readonly is: string = "KissManga";
  public readonly baseURL: URL = new URL("http://kissmanga.com");
  public readonly provides: ProviderType = ProviderType.Comic;
  protected readonly urlDecrypter: KissMangaUrlDecrypter;

  constructor(cloudkicker?: CloudKicker) {
    super(cloudkicker);
    this.urlDecrypter = new KissMangaUrlDecrypter(this.baseURL, cloudkicker);
  }

  public clearCache() {
    super.clearCache();
    this.urlDecrypter.clearCache();
  }

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
          const selector = [
            "#leftside", "div:nth-child(1)", "div.barContent", "div:nth-child(2)",
          ].join(" > ");
          const detailsNode = $(selector);
          const name = detailsNode.find("a").first().text();
          const associatedNames: ISource[] = detailsNode.find("p:nth-child(2) > a")
            .toArray().map((node) => {
              const element = $(node);
              const associatedName: string = element.text().trim();
              const location = new URL(element.attr("href"), this.baseURL.href);
              return {
                name: (associatedName),
                source: (location),
              };
            });
          const genreNames: string[] = detailsNode.find("p:nth-child(3) > a").toArray()
            .map((genreNode: CheerioElement) => $(genreNode).text().trim());
          const type: Type | undefined = [
            ...new Set(genreNames.map((genre: string) => TypeMap.toValue(genre))),
          ][0];
          const genres: Genre[] = genreNames.map((genre: string) => GenreMap.toValue(genre, Genre.Unknown))
            .filter((genre: Genre) => genre !== Genre.Unknown);
          const authorArtist: string[] = detailsNode.find("p:nth-child(4) > a").toArray()
            .map((node) => $(node).text().trim());

          const statusText: RegExpMatchArray = detailsNode.find("p:nth-child(5)").text()
            .match(/status:\s(\w+)/i) as RegExpMatchArray;
          const status: Status = _.get(Status, statusText[1], Status.Unknown);

          const description = detailsNode.find("p:nth-child(7)").text().trim();

          const coverNode = $("#rightside > div:nth-child(1) > div.barContent > div:nth-child(2) > img");
          const coverLocation = new URL(coverNode.attr("src"));
          const covers: ICover[] = coverNode ? [{
            MIME: "image/jpeg",
            Thumbnail: (coverLocation),
            side: CoverSide.Front,
            volume: 1,
          }] : [];

          return {
            about: {
              artists: (authorArtist),
              associatedNames: (associatedNames),
              authors: (authorArtist),
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
            "#leftside", "div:nth-child(4)", "div.barContent.chapterList",
            "div:nth-child(2)", "table", "tbody", "tr:has(td:nth-child(1) > a)",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reverse().reduce((chapters, node) => {
            const element = $(node);
            const sourceElement: Cheerio = element.find("a");
            const nameParts: string[] = sourceElement.text().split(":")
              .map((str) => str.trim()).filter((str) => !!(str));
            const name: string = _.last(nameParts) as string;
            const location = new URL(sourceElement.attr("href"), this.baseURL.href);
            const chapterMatch: RegExpMatchArray | null = (_.first(nameParts) as string).match(/\d+$/);
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
      return Promise.reject(new Error("The passed source was not for this provider."));
    } else {
      return this.cloudkicker.get(source.source, { Referer: source.source.href })
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

  protected async querySearchCache(title: string): Promise<ICacheScoredResult<ISource>> {
    let result: ICacheScoredResult<ISource> = { key: "", value: undefined, score: 0 };
    if (!this.searchCache.isEmpty) {
      result = this.searchCache.bestMatch(title);
    }
    const query: boolean = this.searchCache.isEmpty || result.score < 0.9;
    if (query) {
      const queryUrl = new URL("/AdvanceSearch", this.baseURL);
      const dataMap: { [key: string]: any } = {
        authorArtist: "",
        genres: 0,
        mangaName: (title),
        status: "",
      };
      const data: string = Object.keys(dataMap)
        .map((key: string) => {
          return [key, dataMap[key]]
            .map(encodeURIComponent)
            .join("=").replace(/undefined$/, "");
        }).join("&");
      return this.cloudkicker.post(queryUrl, data, { Referer: queryUrl.href })
        .then(({response}) => {
          const $ = cheerio.load(response.body);
          const selector = [
            "#leftside", "div", "div.barContent", "div:nth-child(2)",
            "table", "tbody", "tr", "td:nth-child(1)", "a",
          ].join(" > ");
          const nodes = $(selector);
          return nodes.toArray().reduce((cache, node) => {
            const element = $(node);
            const name = element.text().trim();
            const value = element.attr("href").trim();
            const location = new URL(value, this.baseURL);
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

const ScriptType = stringEnum(["ca", "lo"]);
type ScriptType = keyof typeof ScriptType;

export class KissMangaUrlDecrypter {
  protected cloudkicker: CloudKicker;
  protected baseURL: URL;

  private rawCryptoScript: string | undefined;
  private cryptoScript: vm.Script | undefined;

  private get sandbox(): vm.Context {
    return vm.createContext({
      alert: () => undefined, // Let's not and say we did...
      document: {},
      location: {
        reload: () => undefined, // Let's not and say we did...
      },
    });
  }

  private get vmOptions(): vm.ScriptOptions {
    return {
      timeout: 1000,
    };
  }

  constructor(baseURL: URL, cloudkicker?: CloudKicker, preloadScript: boolean = false) {
    this.baseURL = baseURL;
    this.cloudkicker = cloudkicker || new CloudKicker();
    if (preloadScript) { this.loadScripts(); }
  }

  public clearCache() {
    this.rawCryptoScript = undefined;
    this.cryptoScript = undefined;
  }

  public async getWrapKA(body: any): Promise<(hash: string) => Promise<string>> {
    if (!_.isString(body)) { body = body.toString(); }
    const decryptionKeyMatch: RegExpMatchArray = body.match(/\>\s*(.+CryptoJS.SHA256\(chko\))/);
    if (!decryptionKeyMatch || decryptionKeyMatch.length < 2) {
      return Promise.reject(new Error("Unable to locate decryption key."));
    } else {
      const decryptionKey = decryptionKeyMatch[1];
      const cryptoScript = await this.loadScripts();
      const decryptionKeyScript = new vm.Script(decryptionKey);
      const decryptionKeySandbox = this.sandbox;
      cryptoScript.runInContext(decryptionKeySandbox, this.vmOptions);
      decryptionKeyScript.runInContext(decryptionKeySandbox, this.vmOptions);
      const wrapKA = (hash: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          try {
            const decryptionKeyMap = (decryptionKeySandbox as { document: { [key: string]: string } }).document;
            if (!(hash in decryptionKeyMap)) {
              vm.runInContext(`calcHash("${hash}");`, decryptionKeySandbox, this.vmOptions);
            }
            return resolve(decryptionKeyMap[hash]);
          } catch (error) { return reject(error); }
        });
      };
      return wrapKA;
    }
  }

  private async load(script: ScriptType) {
    const location = new URL(`/Scripts/${script}.js`, this.baseURL.href);
    return await this.cloudkicker.get(location);
  }

  private async loadScripts(): Promise<vm.Script> {
    if (this.cryptoScript) {
      return Promise.resolve(this.cryptoScript);
    } else {
      return Promise.all([
        this.load(ScriptType.ca),
        this.load(ScriptType.lo),
      ]).then((results) => {
        this.rawCryptoScript = results.map(({response}) => response.body.toString()).join(";");
        this.rawCryptoScript = [
          this.rawCryptoScript, "var document={}",
          "function calcHash(hash){if (!(hash in document)) {document[hash] = wrapKA(hash);}}",
        ].join(";");
        return this.cryptoScript = new vm.Script(this.rawCryptoScript);
      });
    }
  }
}
