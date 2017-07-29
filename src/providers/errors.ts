import { ICacheScoredResult } from "../cache";
export class ProviderErrors {
  public static FUNCTION_NOT_IMPLEMENTED: Error = new Error("This function is not yet implemented by this provider.");
  public static FUNCTION_NOT_SUPPORTED: Error = new Error("This function is not supported by this provider.");
  public static INCORRECT_SOURCE: Error = new Error("The passed source was not for this provider.");

  public static REQUIRES_AUTHENTICATION: Error = new Error("Provider requires authentication.");
  public static AUTHENTICATION_INCORRECT: Error = new Error("Your username and/or password was incorrect.");
  public static UNABLE_TO_AUTHENTICATION: Error = new Error("Unable to authenticate.");

  public static TITLE_NOT_FOUND: Error = new Error("Title not found.");
  public static CACHE_RESULT_NOT_FOUND(result: ICacheScoredResult<any>): Error {
    return new Error(`Title not found. Closest match: ${result.key}@${result.score}`);
  }
}
