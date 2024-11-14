import { Injectable } from "@angular/core";


@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  /**
   * Gets the most descriptive error message available in the given error
   */
  getErrorMessage(error: any): string {

    return error?.cinchyException?.data?.details ?? error?.cinchyException?.message ?? error.message ?? "";

    // In the future, we will want to include both pieces of information as part of the same notification, but for now
    // we just want a simplified breakdown which prioritizes the most relevant information
    /*
     * const message = error?.cinchyException?.data?.details || null;
     * const details = error?.cinchyException?.message || error?.message || null;
     *
     * if (message && details) {
     *   return `${message}<br /><br />${details}`;
     * }
     * else {
     *   return `${message || details}`;
     * }
     */
  }
}
