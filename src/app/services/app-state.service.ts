import {
  BehaviorSubject,
  Observable,
  Subject
} from "rxjs";

import { Injectable } from "@angular/core";

import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";


@Injectable({
  providedIn: "root"
})
export class AppStateService {

  formMetadata: IFormMetadata;
  hasFormChanged: boolean;
  selectedOpportunityId: number;

  childRecordUpdated$ = new Subject<boolean>();
  currentSection$ = new BehaviorSubject<string>(null);
  latestRenderedSections$ = new BehaviorSubject<IFormSectionMetadata[]>(null);
  newContactAdded$ = new Subject<any>();
  savedParentFromChildPlus$ = new Subject<boolean>();


  /**
   * Notifies the view that an ID for the root form has been ingested so that the app can be initialized
   */
  rootFormIdSet$ = new BehaviorSubject<string>(null);

  /**
   * Notifies subscribers that a new record has been selected
   */
  onRecordSelected$ = new BehaviorSubject<{ cinchyId: number | null, doNotReloadForm: boolean }>(null);

  saveClicked$ = new BehaviorSubject<void>(null);


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


  getChildRecordUpdateState(): Observable<boolean> {

    return this.childRecordUpdated$.asObservable();
  }


  getCurrentSectionClicked(): Observable<any> {

    return this.currentSection$.asObservable();
  }


  getLatestRenderedSections(): Observable<IFormSectionMetadata[]> {

    return this.latestRenderedSections$.asObservable();
  }


  getNewContactAdded(): Observable<any> {

    return this.newContactAdded$.asObservable();
  }


  getOpenOfChildFormAfterParentSave(): Observable<any> {

    return this.savedParentFromChildPlus$.asObservable();
  }


  newContactAdded(contact) {

    this.newContactAdded$.next(contact);
  }


  sectionClicked(sectionName) {

    this.currentSection$.next(sectionName);
  }


  setChildRecordUpdateState(isUpdated) {

    this.childRecordUpdated$.next(isUpdated);
  }


  setRootFormId(id: string): void {

    this._formId = id;

    this.rootFormIdSet$.next(this._formId);
  }


  setOpenOfChildFormAfterParentSave(childData) {

    return this.savedParentFromChildPlus$.next(childData);
  }


  setLatestRenderedSections(sections: IFormSectionMetadata[]) {

    this.latestRenderedSections$.next(sections);
  }


  setRecordSelected(cinchyId: number | null, doNotReloadForm: boolean = false): void {

    this._rowId = cinchyId;

    this.onRecordSelected$.next({ cinchyId, doNotReloadForm });

    sessionStorage.setItem("rowId", this._rowId ? this._rowId.toString() : "");
    sessionStorage.setItem("formId", this.formId ?? "");
  }
}
