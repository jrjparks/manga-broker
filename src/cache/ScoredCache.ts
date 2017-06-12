import _ = require("lodash");
import { StringUtil } from "../util/string";
import { Cache, ICacheResult } from "./Cache";

export interface ICacheScoredResult<T> extends ICacheResult<T> {
  score: number;
}

export class ScoredCache<T> extends Cache<T> {
  public get(key: string): ICacheResult<T> {
    key = StringUtil.normalize(key);
    return {
      key: (key),
      value: (this.internalCache[key]),
    };
  }

  public update(key: string, value: T): this {
    return super.update(StringUtil.normalize(key), value);
  }

  public remove(key: string): this {
    return super.remove(StringUtil.normalize(key));
  }

  public bestMatch(query: string): ICacheScoredResult<T> {
    const queryNormalized = StringUtil.normalize(query);
    const key: string = queryNormalized in this.internalCache ?
      queryNormalized : _.first(this.keysSortedBy(queryNormalized)) as string;
    const score = StringUtil.similarity(queryNormalized, key);
    const value = this.internalCache[key];
    return {
      key: (key),
      score: (score),
      value: (value),
    };
  }

  private keysSortedBy(value: string): string[] {
    return this.keys.sort((a, b) => Math.sign(StringUtil.similarity(b, value) - StringUtil.similarity(a, value)));
  }
}
