import _ = require("lodash");
import { StringUtil } from "../util/string";
import { Cache, ICacheResult } from "./Cache";

export interface ICacheScoredResult<T> extends ICacheResult<T> {
  score: number;
}

export class ScoredCache<T> extends Cache<T> {
  public update(key: string, value: T): ScoredCache<T> {
    return super.update(StringUtil.normalize(key), value) as ScoredCache<T>;
  }

  public bestMatch(query: string): ICacheScoredResult<T> {
    const queryNormalized = StringUtil.normalize(query);
    const key = queryNormalized in this.internalCache ? queryNormalized : _.first(this.keysSortedBy(queryNormalized));
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
