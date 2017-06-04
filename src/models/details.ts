import { IAbout } from "./about";
import { IMeta } from "./meta";
import { ISource } from "./source";
export interface IDetails extends ISource {
  about?: IAbout;
  meta?: IMeta;
}
