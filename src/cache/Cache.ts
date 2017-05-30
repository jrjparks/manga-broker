import _ = require("lodash");

export interface ICache<T> {
  [key: string]: T | undefined;
}

export interface ICacheResult<T> {
  key: string;
  value: T | undefined;
}

export class Cache<T> {
  protected readonly internalCache: ICache<T> = {};

  public get keys(): string[] {
    return Object.keys(this.internalCache);
  }

  public get size(): number {
    return this.keys.length;
  }

  public get isEmpty(): boolean {
    return _.isEmpty(this.internalCache);
  }

  public get(key: string): ICacheResult<T> {
    return {
      key: (key),
      value: (this.internalCache[key]),
    };
  }

  public clear(): Cache<T> {
    this.keys.forEach((key) => delete this.internalCache[key]);
    return this;
  }

  public update(key: string, value: T): Cache<T> {
    this.internalCache[key] = value;
    return this;
  }

  public remove(key: string): Cache<T> {
    delete this.internalCache[key];
    return this;
  }
}
