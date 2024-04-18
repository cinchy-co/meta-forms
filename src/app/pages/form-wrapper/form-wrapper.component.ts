import { takeUntil } from "rxjs/operators";

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from "@angular/core";
import { MediaMatcher } from "@angular/cdk/layout";
import { MatSidenav } from "@angular/material/sidenav";

import { NgxSpinnerService } from "ngx-spinner";

import { AppStateService } from "../../services/app-state.service";
import { CinchyQueryService } from "../../services/cinchy-query.service";
import { ErrorService } from "../../services/error.service";
import { NotificationService } from "../../services/notification.service";

import { IFormMetadata } from "../../models/form-metadata-model";
import { IFormSectionMetadata } from "../../models/form-section-metadata.model";
import { ILookupRecord } from "../../models/lookup-record.model";

import { IframeUtil } from "../../util/iframe-util";


@Component({
  selector: "app-form-wrapper",
  templateUrl: "./form-wrapper.component.html",
  styleUrls: ["./form-wrapper.component.scss"]
})
export class FormWrapperComponent implements OnInit {

  @ViewChild("sidenav") sidenav: MatSidenav;

  formMetadata: IFormMetadata;
  formSectionsMetadata: IFormSectionMetadata[];
  lookupRecords: ILookupRecord[];

  mobileQuery: MediaQueryList;

  formId: string;

  private readonly mobileQueryListener: () => void;


  get brandedFormWrapperTheme(): string {

    return `form-wrapper-theme--${this.formMetadata?.brand}`;
  }


  get fullScreenHeight(): string {

    return IframeUtil.fullScreenHeight;
  }


  constructor(
    private _appStateService: AppStateService,
    private _cinchyQueryService: CinchyQueryService,
    private _errorService: ErrorService,
    private _notificationService: NotificationService,
    private _spinnerService: NgxSpinnerService,
    public changeDetectorRef: ChangeDetectorRef,
    public media: MediaMatcher
  ) {

    // For Sidenav
    this.mobileQuery = media.matchMedia("(max-width: 600px)");
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }


  ngOnInit(): void {

    this._appStateService.rootFormIdSet$.subscribe(
      {
        next: async (formId: string): Promise<void> => {

          this.formId = formId;

          await this.loadFormMetadata();
        }
      }
    );
  }


  handleOnLookupRecordFilter(filter: string): void {

    let resolvedFilter: string = (
      filter ?
        `LOWER(CAST([${this.formMetadata.subTitleColumn ?? "Cinchy ID"}] as nvarchar(MAX))) LIKE LOWER('%${filter}%')` :
        null
    );

    // Ensure that if there is a default filter on the field, it is not lost
    if (resolvedFilter && this.formMetadata.lookupFilter) {
      resolvedFilter += ` AND ${this.formMetadata.lookupFilter}`;
    }

    this.loadLookupRecords(this.formMetadata, resolvedFilter ?? this.formMetadata.lookupFilter);
  }


  async loadFormMetadata(): Promise<void> {

    try {
      await this._spinnerService.show();

      const formMetadata: IFormMetadata = await this._cinchyQueryService.getFormMetadata().toPromise();

      this.formMetadata = this._appStateService.formMetadata = formMetadata;

      this.lookupRecords = [];

      await this.loadFormSections();
    }
    catch (error: any) {
      this._notificationService.displayErrorMessage(
        `Error getting form metadata. ${ this._errorService.getErrorMessage(error) }`
      );

      await this._spinnerService.hide();
    }
  }


  async loadFormSections(): Promise<void> {

    try {
      await this._spinnerService.show();

      const formSections: Array<IFormSectionMetadata> = await this._cinchyQueryService.getFormSectionsMetadata().toPromise();

      this.formSectionsMetadata = formSections;

      this._appStateService.latestRenderedSections$.next(formSections);

      await this._spinnerService.hide();
    }
    catch (error: any) {

      await this._spinnerService.hide();

      this._notificationService.displayErrorMessage(
        `Error getting section metadata. ${ this._errorService.getErrorMessage(error) }`
      );
    }
  }

  loadLookupRecords(formMetadata: IFormMetadata, filter?: string, limitResults?: boolean): void {

    this._cinchyQueryService.resetLookupRecords.next();

    this._cinchyQueryService.getLookupRecords(
      formMetadata.subTitleColumn,
      formMetadata.domainName,
      formMetadata.tableName,
      filter ?? formMetadata.lookupFilter,
      limitResults
    ).pipe(
      takeUntil(this._cinchyQueryService.resetLookupRecords)
    ).subscribe(
      {
        next: (response: Array<ILookupRecord>): void => {

          this.lookupRecords = response;
        },
        error: async (error: any): Promise<void> => {

          await this._spinnerService.hide();

          this._notificationService.displayErrorMessage(
            `Error getting lookup records. ${ this._errorService.getErrorMessage(error) }`
          );
        }
      }
    );
  }
}
