import { URL } from "url";
export enum CoverSide {
  Unknown = 0,
  Front = 1,
  Back,
  Side,
  Full,
  TableOfContents,
}

export interface ICover {
  MIME: string;
  side: CoverSide;
  volume: number;

  Normal?: URL;
  NormalSize?: number;
  NormalX?: number;
  NormalY?: number;

  Raw?: URL;
  RawSize?: number;
  RawX?: number;
  RawY?: number;

  Thumbnail?: URL;
  ThumbnailSize?: number;
  ThumbnailX?: number;
  ThumbnailY?: number;
}
