import { ICover } from "./cover";
import { Genre } from "./genre";
import { ISource } from "./source";
import { Type } from "./type";
export interface IAbout {
  type?: Type;
  releaseYear?: number;
  description?: string;

  rating?: number;
  genres?: Genre[];
  categories?: ISource[];
  associatedNames?: ISource[];
  covers?: ICover[];

  authors?: string[];
  artists?: string[];
}
