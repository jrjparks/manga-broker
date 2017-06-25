///  <reference types="cheerio"/>
import { URL } from "url";
import { ISource } from "../models";
import { IProvider } from "../provider";
export function parseLinkFn(self: IProvider, $: CheerioStatic): (node: CheerioElement) => ISource | undefined {
  const parseLink = (node: CheerioElement): ISource | undefined => {
    const element = $(node);
    const name = element.text().trim();
    const href = element.attr("href");
    if (href.includes("javascript:")) {
      return undefined;
    } else {
      const location: URL = new URL(href.includes("://") ? href : `${self.baseURL}/${href}`);
      return {
        name: (name),
        source: (location),
      } as ISource;
    }
  };
  return parseLink.bind(self) as (node: CheerioElement) => ISource | undefined;
}
