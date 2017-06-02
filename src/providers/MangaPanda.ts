import { URL } from "url";
import { MangaReader } from "./MangaReader";

export class MangaPanda extends MangaReader {
  public readonly is: string = "MangaPanda";
  public readonly baseURL: URL = new URL("http://www.mangapanda.com");
}
