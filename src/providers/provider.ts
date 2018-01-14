/* tslint:disable:max-classes-per-file */
import { CloudKicker } from "cloudkicker";
import { Url } from "url";

import {
  ScoredCache,
} from "../cache";
import {
  IChapter,
  IDetails,
  ISearchOptions,
  ISearchResults,
  ISource,
  ProviderType,
} from "../models";

export interface IProvider {
  readonly is: string;
  readonly baseURL: Url;
  readonly provides: ProviderType;
  /**  */
  search(title: string, options ?: ISearchOptions): Promise<ISearchResults>;
  /** Similar to search except it will only return the closest match. */
  find(title: string): Promise<ISource>;
  details(source: ISource): Promise<IDetails>;
}

export interface ISourceProvider extends IProvider {
  chapters(source: ISource): Promise<IChapter[]>;
  pages(source: ISource): Promise<ISource[]>;
}

export interface INovelProvider extends IProvider {
  chapters(source: ISource): Promise<IChapter[]>;
  chapter(source: ISource): Promise<string>;
}

export interface IAuthentableProvider extends IProvider {
  isAuthenticated: boolean;
  authenticate(username: string, password: string): Promise<this>;
  deauthenticate(): Promise<this>;
}

export function isProvider(provider: IProvider): provider is IProvider {
  return (provider as IProvider) &&
    (provider as IProvider).is !== undefined &&
    (provider as IProvider).baseURL !== undefined &&
    (provider as IProvider).search !== undefined &&
    (provider as IProvider).find !== undefined &&
    (provider as IProvider).details !== undefined;
}

export function isSourceProvider(provider: IProvider): provider is ISourceProvider {
  return isProvider(provider) &&
    (provider as ISourceProvider).chapters !== undefined &&
    (provider as ISourceProvider).pages !== undefined;
}

export function isNovelProvider(provider: IProvider): provider is INovelProvider {
  return isProvider(provider) &&
    (provider as INovelProvider).chapters !== undefined &&
    (provider as INovelProvider).chapter !== undefined;
}

export function isAuthentableProvider(provider: IProvider): provider is IAuthentableProvider {
  return isProvider(provider) &&
    (provider as IAuthentableProvider).authenticate !== undefined &&
    (provider as IAuthentableProvider).deauthenticate !== undefined;
}

export class ProviderCore {
  protected readonly cloudkicker: CloudKicker;
  protected readonly searchCache: ScoredCache<ISource> = new ScoredCache<ISource>();

  constructor(cloudkicker ?: CloudKicker) {
    this.cloudkicker = cloudkicker || new CloudKicker();
  }

  public clearCache(): void {
    this.searchCache.clear();
  }
}
