export class ValueMapper<V> {
  protected internalKeys: string[] = new Array<string>();
  protected internalValues: V[] = new Array<V>();

  constructor(initial?: { [key: string]: V }) {
    if (initial) {
      for (const key of Object.keys(initial)) {
        this.add(key, initial[key]);
      }
    }
  }

  /** Add a key-value pair to the Dictionary */
  public add(key: string, value: V): this {
    const index = this.internalKeys.indexOf(key, 0);
    if (index >= 0) {
      this.internalValues[index] = value;
    } else {
      this.internalKeys.push(key);
      this.internalValues.push(value);
    }
    return this;
  }

  /** Remove a key-value pair from the Dictionary */
  public remove(...internalKeys: string[]): this {
    for (const key of internalKeys) {
      const index = this.internalKeys.indexOf(key, 0);
      if (index >= 0) {
        this.internalKeys.splice(index, 1);
        this.internalValues.splice(index, 1);
      }
    }
    return this;
  }

  public toKey(value: V): string | undefined {
    const index = this.internalValues.indexOf(value, 0);
    return this.internalKeys[index];
  }

  public toValue(key: string): V | undefined;
  public toValue(key: string, def: V): V;
  public toValue(key: string, def?: V): V | undefined {
    const index = this.internalKeys.indexOf(key, 0);
    return index >= 0 ? this.internalValues[index] : def;
  }

  public get keys(): string[] {
    return [...this.internalKeys];
  }

  /** Test if Dictionary contains key */
  public containsKey(key: string): boolean {
    const index = this.internalKeys.indexOf(key, 0);
    return Boolean(index >= 0);
  }

  public get values(): V[] {
    return [...this.internalValues];
  }

  /** Test if Dictionary contains value */
  public containsValue(value: V): boolean {
    const index = this.internalValues.indexOf(value, 0);
    return Boolean(index >= 0);
  }
}
