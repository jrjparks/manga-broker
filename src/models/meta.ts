import { IPublisher } from "./publisher";
import { ISource } from "./source";
import { Status } from "./status";
export interface IMeta {
  categoryRecommendations?: ISource[];
  groupsScanulating?: ISource[];
  completelyScanulated?: boolean;
  isNovel?: boolean;
  related?: ISource[];
  recommendations?: ISource[];
  status?: Status;
  publisher?: IPublisher;
}
