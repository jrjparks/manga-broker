export class ValueMapper<V> {
  protected keys: string[] = new Array<string>();
  protected values: V[] = new Array<V>();

  constructor(initial?: { [key: string]: V }) {
    if (initial) {
      for (const key of Object.keys(initial)) {
        this.add(key, initial[key]);
      }
    }
  }

  /** Add a key-value pair to the Dictionary */
  public add(key: string, value: V): this {
    const index = this.keys.indexOf(key, 0);
    if (index >= 0) {
      this.values[index] = value;
    } else {
      this.keys.push(key);
      this.values.push(value);
    }
    return this;
  }

  /** Remove a key-value pair from the Dictionary */
  public remove(...keys: string[]): this {
    for (const key of keys) {
      const index = this.keys.indexOf(key, 0);
      if (index >= 0) {
        this.keys.splice(index, 1);
        this.values.splice(index, 1);
      }
    }
    return this;
  }

  public toKey(value: V): string | undefined {
    const index = this.values.indexOf(value, 0);
    return this.keys[index];
  }

  public toValue(key: string): V | undefined;
  public toValue(key: string, def: V): V;
  public toValue(key: string, def?: V): V | undefined {
    const index = this.keys.indexOf(key, 0);
    return index >= 0 ? this.values[index] : def;
  }

  /** Test if Dictionary contains key */
  public containsKey(key: string): boolean {
    const index = this.keys.indexOf(key, 0);
    return Boolean(index >= 0);
  }

  /** Test if Dictionary contains value */
  public containsValue(value: V): boolean {
    const index = this.values.indexOf(value, 0);
    return Boolean(index >= 0);
  }
}
