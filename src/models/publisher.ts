import { ISource } from "./source";

export interface IPublisher {
  englishPublisher: ISource;
  licensed: boolean;
  magazine: ISource;
  publisher: ISource;
}
