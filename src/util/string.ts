/* tslint:disable:no-namespace interface-name */
import * as Diacritics from "./Diacritics";
import { levenshtein } from "./Levenshtein";
const symbolReplacementMap: { [key: string]: string } = {
  "#": "hash",
  "$": "dollar",
  "%": "percent",
  "&": "and",
  "*": "star",
  "@": "at",
};
const symbolReplacementRegex: RegExp = new RegExp(`[\\${Object.keys(symbolReplacementMap).join("\\")}]`, "gi");
const punctuation: string = `\\${"'!\"#$%&()*+,-.\\/:;<=>?@\[\]^_`{|}~".split("").join("\\")}`;
const punctuationRegex: RegExp = new RegExp(`[\u2000-\u206F\u2E00-\u2E7F${punctuation}]`, "gi");

export class StringUtil extends String {
  public static normalize(value: string): string {
    return Diacritics
      .clean(value).trim().toLowerCase()
      .replace(symbolReplacementRegex, (char) => symbolReplacementMap[char] || char)
      .replace(punctuationRegex, "")
      .replace(/[\s\t]/g, "");
  }

  public static similarity(a: string, b: string): number {
    if (a.length > b.length) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    const bLength = b.length;
    if (bLength === 0) {
      return 0;
    } else {
      return (bLength - levenshtein(b, a)) / bLength;
    }
  }
}
