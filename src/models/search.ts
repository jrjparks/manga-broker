import { ISource } from "./source";
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
