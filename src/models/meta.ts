import { ISource } from "./source";
export interface IMeta {
  categoryRecommendations?: ISource[];
  groupsScanulating?: ISource[];
  isNovel?: boolean;
  related?: ISource[];
  recommendations?: ISource[];
}
