import { URL } from "url";

export enum Type {
  Manga,
  Manhwa,
  Manhua,
}

export enum Status {
  Ongoing,
  Completed,
  Cancelled,
}

export enum Genre {
  Action,
  Adult,
  Adventure,
  Comedy,
  Doujinshi,
  Drama,
  Ecchi,
  Fantasy,
  GenderBender,
  Harem,
  Hentai,
  Historical,
  Horror,
  Josei,
  Lolicon,
  MartialArts,
  Mature,
  Mecha,
  Mystery,
  Psychological,
  Romance,
  SchoolLife,
  Scifi,
  Seinen,
  Shotacon,
  Shoujo,
  ShoujoAi,
  Shounen,
  ShounenAi,
  SliceofLife,
  Smut,
  Sports,
  Supernatural,
  Tragedy,
  Yaoi,
  Yuri,
}

export interface ISource {
  name: string;
  source: URL;
}

export interface IChapter extends ISource {
  volume?: number;
  chapter?: number;
  subChapter?: number;

  language?: string;
  date?: Date;
}

export enum CoverSide {
  Front,
  Back,
  Side,
  Full,
  TableOfContents,
}

export interface ICover {
  MIME: string;
  side: CoverSide;
  volume: number;

  Normal?: URL;
  NormalSize?: number;
  NormalX?: number;
  NormalY?: number;

  Raw?: URL;
  RawSize?: number;
  RawX?: number;
  RawY?: number;

  Thumbnail?: URL;
  ThumbnailSize?: number;
  ThumbnailX?: number;
  ThumbnailY?: number;
}

export interface IDetails extends ISource {
  about?: IAbout;
  meta?: IMeta;
}

export interface IMeta {
  categoryRecommendations?: ISource[];
  groupsScanulating?: ISource[];
  isNovel?: boolean;
  related?: ISource[];
  recommendations?: ISource[];
}

export interface IAbout {
  type?: Type;
  releaseYear?: number;
  description?: string;

  rating?: number;
  genres?: Genre[];
  categories?: ISource[];
  associatedNames?: ISource[];
  covers?: ICover[];

  authors?: string[];
  artists?: string[];
}

export interface IStatus {
  status?: Status;
}

export interface IPublisher {
  original?: string;
  magazine?: string;
  licensed?: boolean;
}

export interface ISearchOptions {
  excludeNovels?: boolean;
  limit?: number;
  page?: number;
  fuzzy?: boolean;
}

export interface ISearchResults {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  options?: ISearchOptions;
  page: number;
  results: ISource[];
}
