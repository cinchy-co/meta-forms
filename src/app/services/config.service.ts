import { forkJoin, Observable, of } from "rxjs";
import { catchError, concatMap, tap } from "rxjs/operators";

import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { CinchyConfig } from "@cinchy-co/angular-sdk";

import { ErrorService } from "./error.service";

import { IframeUtil } from "../util/iframe-util";


@Injectable({
  providedIn: "root",
})
export class ConfigService {

  get cinchyVersion(): string {

    return this._cinchyVersion;
  }
  private _cinchyVersion: string;


  get envConfig(): CinchyConfig {

    return this._environmentConfig;
  }
  private _environmentConfig: CinchyConfig;


  constructor(
    @Inject("BASE_URL") private baseUrl: string,
    private http: HttpClient,
    private _errorService: ErrorService
  ) {

    window.addEventListener("message", this.receiveMessage, false);

    if (localStorage.getItem("cinchy-fullScreenHeight")) {
      IframeUtil.setFrameHeight(localStorage.getItem("cinchy-fullScreenHeight"));
    }
  }


  loadConfig(): Observable<Array<any>> {

    return forkJoin([this.getEnvironmentConfig()]);
  }


  getEnvironmentConfig(): Observable<any> {

    const url = `${this.baseUrl}assets/config/config.json`;

    return this.http.get<any>(url)
      .pipe(
        tap(
          {
            next: (configResponse): void => {

              this._environmentConfig = configResponse;
            }
          }
        ),
        concatMap(
          (configResponse: any): any => {

            return this.http.get(configResponse.cinchyRootUrl.replace(/\/$/, "") + "/healthcheck")
              .pipe(
                catchError(
                  (error: any) => {

                    console.warn("Could not execute healthcheck endpoint", this._errorService.getErrorMessage(error));

                    return of(null);
                  }
                ),
                tap(
                  (healthcheckResp: any): void => {

                    this._cinchyVersion = healthcheckResp?.version ?? null;
                  }
                )
              );
          }
        )
      );
  }


  /**
   * Receive the screen height from the wrapping element
   */
  receiveMessage(event: MessageEvent): void {

    if (event.data.toString().startsWith("[Cinchy][innerHeight]")) {
      const fullScreenHeight: number = parseInt(event.data.toString().substring(21), 10) + 4;

      IframeUtil.setFrameHeight(fullScreenHeight.toString());
    }
  }
}
