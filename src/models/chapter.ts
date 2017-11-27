import { ISource } from "./source";
export interface IChapter extends ISource {
  volume?: number;
  chapter?: number;

  language?: string;
  date?: Date;
}
