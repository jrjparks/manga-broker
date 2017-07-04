import { Genre } from "./genre";
import { ISource } from "./source";
export interface ISearchOptions {
  excludeNovels?: boolean;
  limit?: number;
  page?: number;
  fuzzy?: boolean;
  genres?: Genre[];
}

export interface ISearchResults {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  options?: ISearchOptions;
  page: number;
  results: ISource[];
}
