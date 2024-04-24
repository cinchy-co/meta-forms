import {
  BehaviorSubject,
  Observable,
  Subject
} from "rxjs";

import { Injectable } from "@angular/core";

import { Form } from "../dynamic-forms/models/cinchy-form.model";

import { INewEntityDialogResponse } from "../dynamic-forms/interface/new-entity-dialog-response";

import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";


@Injectable({
  providedIn: "root"
})
export class AppStateService {

  formMetadata: IFormMetadata;

  addNewEntityDialogClosed$ = new Subject<INewEntityDialogResponse>();
  childRecordUpdated$ = new Subject<void>();
  currentSection$ = new BehaviorSubject<string>(null);
  latestRenderedSections$ = new BehaviorSubject<IFormSectionMetadata[]>(null);

  parentFormSavedFromChild$ = new Subject<{
    childForm: Form,
    presetValues?: { [key: string]: any },
    title: string
  }>();


  /**
   * Notifies the view that an ID for the root form has been ingested so that the app can be initialized
   */
  rootFormIdSet$ = new BehaviorSubject<string>(null);

  /**
   * Notifies subscribers that a new record has been selected
   */
  onRecordSelected$ = new BehaviorSubject<{ rowId: number | null, doNotReloadForm: boolean }>(null);


  /**
   * The ID of the primary form, as provided by the query params when the application is bootstrapped. If there is a secondary form present,
   * either from the add new option dialog or because a child form is present, that ID is tracked independently
   */
  get formId(): string {

    return this._formId;
  }
  private _formId: string;


  /**
   * The ID of the currently-selected record on the root form in the main view container. The concept of a selected record is meaningless in the context of
   * creating a new record, and child forms will track their own selected record ID independently, if present.
   */
  get rowId(): number {

    return this._rowId;
  }
  private _rowId: number;


  /**
   * Removes the rowId parameter from the querystring of the application and, if the app is embedded in an iframe, the wrapping view. If the app is not
   * embedded, then posting the message will have no effect.
   */
  deleteRowIdInQueryParams() {

    // Targets the wrapping view
    const message = JSON.stringify({
      deleteCinchyURLParams:
        [
          "rowId"
        ]
    });

    window.parent.postMessage(message, "*");

    // Modifies the app's URL
    const queryParams = window.location.search?.substr(1).split("&").map((paramString: string) => {

      const [key, value] = paramString.split("=");

      // Because the key here will be an empty string in the case the queryParams are empty or malformed,
      // we explicitly need to check that it is truthy. Optional chaining would yield a false position
      if (key && key.toLowerCase() !== "rowid") {
        return `${key}=${value}`;
      }
    }).join("");

    const baseUrl = window.location.href.substr(0, window.location.href.indexOf("?"));

    window.history.replaceState(window.history.state, document.title, `${baseUrl}?${queryParams}`);
  }


  /**
   * Stores the ID of the root form at the application level. Child forms load their IDs locally, and should not affect hte application state
   */
  setRootFormId(id: string): void {

    this._formId = id;

    this.rootFormIdSet$.next(this._formId);
  }


  /**
   * Stores the selected record in the service and updates the application state to match it
   *
   * @param rowId The Cinchy ID of the selected record. If null, the selected record has been cleared
   * @param doNotReloadForm Indicates that a refresh is not required
   */
  setRecordSelected(rowId: number | null, doNotReloadForm: boolean = false): void {

    this._rowId = rowId;

    this.onRecordSelected$.next(
      {
        rowId: rowId,
        doNotReloadForm: doNotReloadForm
      }
    );

    if (rowId === null) {
      this.deleteRowIdInQueryParams();
    }
    else {
      this.updateRowIdInQueryParams(rowId);
    }
  }


  updateRowIdInQueryParams(rowId: number) {

    const messageJSON = {
      updateCinchyURLParams:
      {
        rowId: rowId
      }
    };

    const message = JSON.stringify(messageJSON);

    window.parent.postMessage(message, "*");

    const rowIdQueryParams = messageJSON["updateCinchyURLParams"];
    const rowIdQueryString = Object.keys(rowIdQueryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(rowIdQueryParams[key])}`)
      .join("&");

    const queryParams = window.location.search?.substr(1).split("&").map((paramString: string) => {

      const [key, value] = paramString.split("=");

      // Because the key here will be an empty string in the case the queryParams are empty or malformed,
      // we explicitly need to check that it is truthy. Optional chaining would yield a false position
      if (key && key.toLowerCase() !== "rowid") {
        return `${key}=${value}`;
      }
    }).join("");

    if (queryParams?.length) {
      const baseUrl = window.location.href.substr(0, window.location.href.indexOf("?"));

      window.history.replaceState(window.history.state, document.title, `${baseUrl}?${queryParams}&${rowIdQueryString}`);
    }
    else {
      window.history.replaceState(window.history.state, document.title, `${window.location.href}?${rowIdQueryString}`);
    }
  }
}
