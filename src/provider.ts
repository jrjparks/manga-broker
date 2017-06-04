import { CloudKicker } from "cloudkicker";
import { Url } from "url";
import { ScoredCache } from "./cache/ScoredCache";

import { IChapter } from "./models/chapter";
import { IDetails } from "./models/details";
import { ISearchOptions, ISearchResults } from "./models/search";
import { ISource } from "./models/source";

export interface IProvider {
  readonly is: string;
  readonly baseURL: Url;
  search(title: string, options?: ISearchOptions): Promise<ISearchResults>;
  details(source: ISource): Promise<IDetails>;
}

export interface ISourceProvider extends IProvider {
  chapters(source: ISource): Promise<IChapter[]>;
  pages(source: ISource): Promise<ISource[]>;
}

export interface IAuthentableProvider extends IProvider {
  authenticate(username: string, password: string): Promise<IAuthentableProvider>;
}

export class ProviderCore {
  protected readonly cloudkicker: CloudKicker;
  protected readonly searchCache: ScoredCache<ISource> = new ScoredCache<ISource>();

  // this constructor is really only used for testing
  constructor(cloudkicker?: CloudKicker) {
    this.cloudkicker = cloudkicker || new CloudKicker();
  }

  public clearCache(): void {
    this.searchCache.clear();
  }
}
