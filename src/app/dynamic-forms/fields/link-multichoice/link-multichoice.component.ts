import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";

import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { FormControl } from "@angular/forms";
import { MatSelect } from "@angular/material/select";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { CinchyQueryService } from "../../../services/cinchy-query.service";
import { ConfigService } from "../../../services/config.service";
import { NotificationService } from "../../../services/notification.service";

import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import * as R from "ramda";


/**
 * As the LinkComponent, but allows the user to select multiple entities. The selected entities
 * will be saved to the table as a comma-delimited list of IDs.
 */
@Component({
  selector: "cinchy-link-multichoice",
  templateUrl: "./link-multichoice.component.html",
  styleUrls: ["./link-multichoice.component.scss"],
  providers: [DropdownDatasetService]
})

export class LinkMultichoiceComponent implements OnChanges, OnDestroy, OnInit {

  @ViewChild("fileInput") fileInput: ElementRef;
  @ViewChild("multiSelect", { static: true }) multiSelect: MatSelect;
  @ViewChild("t") public tooltip: NgbTooltip;

  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isInChildForm: boolean;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();


  DROPDOWN_OPTION_SIZE = 42;

  filterCtrl: FormControl<string> = new FormControl();

  selectedValues = [];

  charactersAfterWhichToShowList = 0;
  downloadLink: boolean;
  downloadableLinks: Array<any>;
  dropdownListFromLinkedTable: boolean;
  dropdownSetOptions: Array<DropdownOption>;
  isCursorIn: boolean = false;
  isLoading: boolean;
  maxLimitForMaterialSelect = 4000;
  metadataQueryResult: Array<{ [key: string]: any }>;
  renderImageFiles = true;
  showError: boolean;
  tableSourceURL: any;
  toolTipMessage: string;

  filteredListMulti = new BehaviorSubject<any[]>([]);
  onDestroy = new Subject<void>();

  faShareAlt = faShareAlt;
  faSitemap = faSitemap;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get field(): FormField {

    return this.form?.sections[this.sectionIndex]?.fields[this.fieldIndex];
  }


  get rowIdIsValid(): boolean {

    return (this.form.rowId && this.form.rowId > -1);
  }


  /**
   * Determines the height of the expanded option set. Scales up to at most four options
   */
  get scrollViewportHeight(): number {

    const itemCount = Math.min(4, this.filteredListMulti?.value.length ?? 1);

    return (itemCount * this.DROPDOWN_OPTION_SIZE);
  }


  constructor(
    private _dropdownDatasetService: DropdownDatasetService,
    private _cinchyService: CinchyService,
    private _configService: ConfigService,
    private _cinchyQueryService: CinchyQueryService,
    private _notificationService: NotificationService
  ) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnDestroy(): void {

    this.onDestroy.next();
    this.onDestroy.complete();
  }


  ngOnInit(): void {

    this.bindDropdownList();

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = url + "/Tables/" + this.field.cinchyColumn.linkTargetTableId;
  }


  async bindDropdownList(): Promise<void> {

    if (!this.dropdownListFromLinkedTable) {
      this.isLoading = true;
      let dropdownDataset: DropdownDataset;
      let currentFieldJson: any;

      let tableColumnQuery: string = `
        SELECT
          tc.[Table].[Data Product].[Name] AS 'DataProduct',
          tc.[Table].[Name] AS 'Table',
          tc.[Name] AS 'Column'
        FROM
          [Cinchy].[Cinchy].[Table Columns] tc
        WHERE tc.[Deleted] IS NULL
          AND tc.[Table].[Deleted] IS NULL
          AND tc.[Cinchy ID] = ${this.field.cinchyColumn.linkTargetColumnId};`;


      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData: any = JSON.parse(this.field.cinchyColumn.formFieldsJsonData);

      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }

      if (this.field.cinchyColumn.linkTargetColumnId) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(
          this.field.cinchyColumn.linkTargetColumnId,
          currentFieldJson,
          this.field.cinchyColumn.dropdownFilter,
          this.form.rowId
        );

        this.dropdownListFromLinkedTable = true;

        dropdownDataset = this.getSortedList(dropdownDataset);
        this.field.dropdownDataset = dropdownDataset;

        this.dropdownSetOptions = dropdownDataset?.options ?? [];
        this.charactersAfterWhichToShowList = this.dropdownSetOptions.length > this.maxLimitForMaterialSelect ? 3 : 0;
        this.setFilteredOptions();
        this._setValue();

        if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect && this.selectedValues) {
          this.dropdownSetOptions = this.selectedValues.concat(this.dropdownSetOptions);

          this.dropdownSetOptions = R.uniqBy((item) => {
            return item.id;
          }, this.dropdownSetOptions)

          this.filteredListMulti.next(this.dropdownSetOptions);
        }

        this.checkForAttachmentUrl();
      }

      this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown list of items. You have to select from the dropdown to update this field`;

      this.isLoading = false;
    }
  }


  checkForAttachmentUrl(): void {

    this.downloadLink = coerceBooleanProperty(this.field.cinchyColumn.attachmentUrl);

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValues?.length) {
      this.downloadLink = true;
      this.downloadableLinks = [];

      this.selectedValues.forEach((listItem: any) => {

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
        const replacedFileIdUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", listItem.id);
        const selectedValuesWithUrl = { fileName: listItem.label, fileUrl: replacedFileIdUrl, fileId: listItem.id };

        this.downloadableLinks.push(selectedValuesWithUrl);
      })
    }
  }


  closeTooltip(tooltip) {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  /**
   * The function used to determine whether or not dropdown options represent the same entity
   */
  compareFn(a: DropdownOption, b: DropdownOption): boolean {

    return (a?.id === b?.id);
  }


  /**
   * Ensures that any display columns used to identify options in this set are ignored when showing the value of
   * any options which are currently selected
   */
  displayFn(): string {

    return this.selectedValues?.map((value: DropdownOption) => {

      return value?.label;
    })?.join(". ");
  }


  /**
   * Generates a tooltip for the given link
   */
  downloadableLinkTooltip(link: { fileName: string, fileUrl: string, fileId: string }): string {

    return `Download ${link.fileName}`;
  }


  fileNameIsImage(fileName: string): boolean {

    const lowercase = fileName.toLowerCase();

    return lowercase.endsWith(".png") ||
      lowercase.endsWith(".jpg") ||
      lowercase.endsWith(".jpeg") ||
      lowercase.endsWith(".gif") ||
      lowercase.endsWith(".svg");
  }


  generateMultipleOptionsFromSingle(): Array<DropdownOption> {

    if (this.field.dropdownDataset?.options?.length) {
      let selectedIds: Array<string>;

      // Fallback for legacy logic
      if (
          this.field.dropdownDataset.options.length === 1 &&
          this.field.dropdownDataset.options[0].id?.includes(",")
      ) {
        selectedIds = this.field.dropdownDataset.options[0].id?.split(",").map((id: string) => id.trim());

        this.field.dropdownDataset.options = this.field.dropdownDataset.options[0].label?.split(",").map((label: string, index: number) => {
          return new DropdownOption(
            selectedIds[index],
            label.trim()
          );
        });
      }

      if (this.field.hasValue) {
        // Fallback for legacy logic
        if (typeof this.field.value === "string") {
          selectedIds = this.field.value.split(",").map((id: string) => id.trim() );
        }
        else if (Array.isArray(this.field.value)) {
          selectedIds = this.field.value;
        }
      }

      if (selectedIds?.length) {
        return selectedIds.map((id: string) => {

          return this.field.dropdownDataset.options.find((option: DropdownOption) => {

            // We're explicitly using a double equals here because at this stage the ID may be either a number or string
            return option.id == id;
          });
        });
      }
    }

    return [];
  }


  getAndSetLatestFileValue(): void {

    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.dataProduct, this.field.cinchyColumn.tableName, this.form.rowId).subscribe((resp: Array<{ fileId: any, fileName: string }>) => {

      if (resp?.length) {
        this.field.value = (this.field.value ?? []).concat(resp.map(x => x.fileId));

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form?.rowId.toString());

        this.selectedValues = this.selectedValues ?? [];
        this.downloadableLinks = this.downloadableLinks ?? [];

        resp.forEach((newFile: { fileId: any, fileName: string }) => {

          const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", newFile.fileId?.toString());
          const newSelectedValue = { fileName: newFile.fileName, fileUrl: fileUrl, fileId: newFile.fileId };

          this.selectedValues.push(newSelectedValue);
          this.downloadableLinks.push(newSelectedValue);
        });

        this._cinchyQueryService.updateFilesInCell(
            this.downloadableLinks.map(x => x.fileId),
            this.field.cinchyColumn.name,
            this.field.cinchyColumn.dataProduct,
            this.field.cinchyColumn.tableName,
            this.form.rowId
        ).subscribe(
          {
            next: (): void => {

              this.fileInput.nativeElement.value = null;

              this._notificationService.displaySuccessMessage(
                `${(this.downloadableLinks.length > 1) ? "Files" : "File"} uploaded`
              );
            }
          }
        );
      }
    });
  }


  getSortedList(dropdownDataset: DropdownDataset): DropdownDataset {

    let filteredOutNullSets: Array<DropdownOption>;

    if (dropdownDataset?.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);

      return new DropdownDataset(
        filteredOutNullSets.sort((a: DropdownOption, b: DropdownOption) => {

          const labelA = a.label?.toString()?.toLocaleLowerCase() ?? "";
          const labelB = b.label?.toString()?.toLocaleLowerCase() ?? "";

          return labelA.localeCompare(labelB);
        })
      );
    }

    return null;
  }


  openTooltip(tooltip: NgbTooltip): void {

    tooltip.open();
    this.tooltip = tooltip;

    if (tooltip.isOpen()) {
      const tooltipElement = document.getElementsByTagName("ngb-tooltip-window");

      if (tooltipElement[0]) {
        tooltipElement[0].addEventListener("mouseleave", this.removeTooltipElement.bind(this));
        tooltipElement[0].addEventListener("mouseenter", this.setTooltipCursor.bind(this));
      }
    }
  }


  onDeleteFile(item: any): void {

    if (item.fileId && this.selectedValues?.length) {
      this.selectedValues = this.selectedValues.filter((value: any) => {

        return (value.fileId?.toString !== item.fileId?.toString());
      });

      this.downloadableLinks = this.downloadableLinks.filter(x => x.fileId !== item.fileId);

      this.valueChanged();
    }
  }


  onFileSelected(event: any): void {

    if (event?.target?.files?.length) {
      const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId?.toString());

      this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
        {
          error: () => {

            this._notificationService.displayErrorMessage(
              `Could not upload the ${(this.downloadableLinks.length > 1) ? "files" : "file"}`
            );
          },
          next: () => {

            this.getAndSetLatestFileValue();
          }
        }
      );
    }
  }


  removeTooltipElement(): void {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  setFilteredOptions(): void {

    this.selectedValues = [];

    // load the initial list
    this.filteredListMulti.next(this.dropdownSetOptions);

    if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect) {
      this.charactersAfterWhichToShowList = 2;
    }

    this.filterCtrl.valueChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => {

        this._filter();
      });
  }


  setTooltipCursor(): void {

    this.isCursorIn = true;
  }


  toggleSelectAll(selectAll: boolean): void {

    this.selectedValues = selectAll ?
      this.filteredListMulti.value:
      [];
    this.valueChanged();
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.selectedValues?.map((value: any) => {

        return value.id;
      }) ?? [],
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _filter(): void {

    if (this.dropdownSetOptions) {
      // get the search keyword
      let search = this.filterCtrl.value;

      if (!search) {
        this.filteredListMulti.next(this.dropdownSetOptions);
      }
      else {
        search = search.toLowerCase();

        // filter the list
        this.filteredListMulti.next(
          this.dropdownSetOptions.filter(
            (item: DropdownOption) => {

              return ((item.displayOnlyLabel || item.label)?.toString().toLowerCase().indexOf(search) > -1)
            }
          )
        );
      }
    }
  }


  private _setValue(): void {

    if (this.field.dropdownDataset?.options?.length || this.isInChildForm) {
      this.selectedValues = this.generateMultipleOptionsFromSingle();
    }
  }
}
