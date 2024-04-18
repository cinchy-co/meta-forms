import { Component, OnInit } from "@angular/core";

import { Cinchy, CinchyService } from "@cinchy-co/angular-sdk";

import { AppStateService } from "./services/app-state.service";
import { ErrorService } from "./services/error.service";
import { NotificationService } from "./services/notification.service";


@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {

  loginDone: boolean;


  constructor(
      private cinchyService: CinchyService,
      private appStateService: AppStateService,
      private _errorService: ErrorService,
      private _notificationService: NotificationService
  ) {}


  ngOnInit(): void {

    this.cinchyService.checkIfSessionValid().toPromise().then((response: { accessTokenIsValid: boolean }) => {

      if (response.accessTokenIsValid) {
        this.loadRoute();
      } else {
        this.cinchyService.login().then(
          (success: boolean): void => {

            if (success) {
              this.loadRoute();
            }
            else {
              throw new Cinchy.CinchyException("Login failed");
            }
          },
          (error: any): void => {

            this._notificationService.displayErrorMessage(
              `Could not login. ${this._errorService.getErrorMessage(error)}`
            );
          }
        );
      }
    });
  }


  /**
   * @returns The value of the "rowId" query parameter from the given URI as a number. If the rowId
   *          is invalid or unset, will will return null instead.
   */
  getRowIdFromUri(uri: string): number {

    let idAsString: string;
    let idAsNumber: number;

    if (uri) {
      idAsString = this.getQueryStringValue("rowId", uri);
    }

    if (idAsString) {
      try {
        idAsNumber = parseInt(idAsString);

        return idAsNumber;
      }
      catch {
        return null;
      }
    }

    return null;
  }


  /**
   * Pulls the value with the target key out of the querystring
   */
  getQueryStringValue(key: string, uri: string): string {

    const value: string = decodeURIComponent(uri.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));

    return (value && value !== "null") ? value : null;
  }


  /**
   * Initializes the view and sets the appropriate session state
   */
  loadRoute(): void {

    // Ensure that the window's location is stable before trying to access the query params
    setTimeout(
      async (): Promise<void> => {

        this.setRowAndFormId();

        this.loginDone = true;
      },
      1
    );
  }


  /**
   * Retrieves the rowId and formId from the URL and ensures the session is up to date
   */
  setRowAndFormId(): void {

    const uri: string = window.location.search;
    const parentUri: string = (window.location === window.parent.location) ? window.location.search : window.parent.location.search;

    // If the app is embedded, it's possible that the querystring can be passed in through the parent's queryParams, so we need to check to
    // see if the formId is present there, and then use those if that is the case. If the app is not embedded, or if the parent instead sets
    // the embedded frame's target using the querystring, then we use this window's queryParams instead
    const resolvedUri: string = parentUri?.toLowerCase().includes("formid") ? parentUri : uri;

    this.appStateService.setRootFormId(this.getQueryStringValue("formId", resolvedUri));
    this.appStateService.setRecordSelected(this.getRowIdFromUri(resolvedUri), false);
  }
}
