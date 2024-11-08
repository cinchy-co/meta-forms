import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith } from "rxjs/operators";

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { MatSelectChange } from "@angular/material/select";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";

import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { ChildFormComponent } from "../child-form/child-form.component";

import { DataFormatType } from "../../enums/data-format-type.enum";

import { IFieldChangedEvent } from "../../interface/field-changed-event";
import { INewEntityDialogResponse } from "../../interface/new-entity-dialog-response";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { AppStateService } from "../../../services/app-state.service";
import { CinchyQueryService } from "../../../services/cinchy-query.service";
import { ConfigService } from "../../../services/config.service";
import { DialogService } from "../../../services/dialog.service";
import { NotificationService } from "../../../services/notification.service";

import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { FormHelperService } from "../../service/form-helper/form-helper.service";

import { isNullOrUndefined } from "util";

import { NumeralPipe } from "ngx-numeral";
import { NgxSpinnerService } from "ngx-spinner";


/**
 * A field representing a linked value. The component itself will internally store a model of
 * the linked entity, but only the ID of that entity will be saved to the table
 */
@Component({
  selector: "cinchy-link",
  templateUrl: "./link.component.html",
  styleUrls: ["./link.component.scss"],
  providers: [DropdownDatasetService]
})
export class LinkComponent implements OnChanges, OnInit {

  @ViewChild("fileInput") fileInput: ElementRef;
  @ViewChild("t") public tooltip: NgbTooltip;

  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() formFieldMetadataResult: any;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
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
  @Output() childForm = new EventEmitter<any>();


  DROPDOWN_OPTION_SIZE = 48;

  // TODO: Add proper type
  metadataQueryResult;

  downloadableLinks: Array<
    {
      fileName: string,
      fileUrl: string,
      fileId: number
    }
  >;

  charactersAfterWhichToShowList: number = 0;
  filteredOptions: Array<DropdownOption>;
  imageIsDownloadable: boolean;
  isCursorIn: boolean = false;
  isLoading: boolean = false;
  showActualField: boolean;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  tableSourceURL: string;

  autocompleteText: string;
  selectedValue: DropdownOption;

  clearOption = new DropdownOption("", "");

  renderImageFiles = true;

  // TODO: global icon singleton?
  faPlus = faPlus;
  faShareAlt = faShareAlt;
  faSitemap = faSitemap;


  private _filterChanged = new Subject<string>();


  get canAdd(): boolean {

    return coerceBooleanProperty(this.field.cinchyColumn.createLinkOptionFormId);
  }


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

    const itemCount = Math.min(4, this.filteredOptions?.length ?? 1);

    return (itemCount * this.DROPDOWN_OPTION_SIZE);
  }


  get searchCharacterLimitMet(): boolean {

    return coerceBooleanProperty(
      !isNullOrUndefined(this.charactersAfterWhichToShowList) &&
      (this.autocompleteText?.length >= this.charactersAfterWhichToShowList)
    );
  }


  get tooltipText(): string {

    return this.charactersAfterWhichToShowList ?
      `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown list of items. You have to select from the dropdown to update this field` :
      "";
  }


  constructor(
    private _appStateService: AppStateService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _cinchyQueryService: CinchyQueryService,
    private _cinchyService: CinchyService,
    private _configService: ConfigService,
    private _dialogService: DialogService,
    private _dropdownDatasetService: DropdownDatasetService,
    private _formHelperService: FormHelperService,
    private _notificationService: NotificationService,
    private _spinnerService: NgxSpinnerService
  ) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnInit(): void {

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = `${url}/Tables/${this.field.cinchyColumn.linkTargetTableId}`;

    this._setValue();

    if (this.isInChildForm && this.field.cinchyColumn.linkedFieldId) {
      this.setWhenNewRowAddedForParent();
    }

    this._appStateService.addNewEntityDialogClosed$.subscribe({
      next: async (value: INewEntityDialogResponse) => {

        if (value && this.filteredOptions && this.metadataQueryResult && this.metadataQueryResult[0]["Table"] === value.tableName) {
          this.filteredOptions = null;

          await this.getListItems(true);
        }
      }
    });

    this._filterChanged.pipe(
      startWith(""),
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe({
      next: (value: string) => {

        this.filteredOptions = this._filter(value);
      }
    });
  }


  checkForAttachmentUrl(): void {

    this.imageIsDownloadable = coerceBooleanProperty(this.field.cinchyColumn.attachmentUrl);

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValue) {
      const replacedCinchyIdUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
      const replacedFileIdUrl = replacedCinchyIdUrl.replace("@fileid", this.selectedValue.id);
      const selectedValuesWithUrl = { fileName: this.selectedValue.label, fileUrl: replacedFileIdUrl, fileId: +this.selectedValue.id };

      this.downloadableLinks = [selectedValuesWithUrl];
    }
  }


  checkForDisplayColumnFormatter(): void {

    if (
        this.field.cinchyColumn.isDisplayColumn &&
        this.field.cinchyColumn.numberFormatter &&
        this.selectedValue
    ) {
      const numeralValue = new NumeralPipe(this.selectedValue.label);
      const stringValue = numeralValue.format(this.field.cinchyColumn.numberFormatter);

      this.selectedValue.label = stringValue;
      this.autocompleteText = stringValue;
    }
  }


  clearSelectedValue(event: KeyboardEvent): void {

    const key = event.key;

    // At this point in the lifecycle, NgModel has not resolved, so we force it to detect changes so that we can accurately
    // read the current state of this.autocompleteText
    this._changeDetectorRef.detectChanges();

    if (key === "Delete" || (key === "Backspace" && this.autocompleteText?.length === 0)) {
      this.autocompleteText = "";
      this.selectedValue = this.clearOption;

      this.valueChanged();
      this.filterChanged();
    }
  }


  closeTooltip(tooltip: NgbTooltip): void {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  fileNameIsImage(fileName: string) {

    const lowercase = fileName.toLowerCase();

    return lowercase.endsWith(".png") ||
      lowercase.endsWith(".jpg") ||
      lowercase.endsWith(".jpeg") ||
      lowercase.endsWith(".gif") ||
      lowercase.endsWith(".svg");
  }


  filterChanged(): void {

    this._filterChanged.next(this.autocompleteText || null);
  }


  getAndSetLatestFileValue(): void {

    this._cinchyQueryService.getFilesInCell(
      this.field.cinchyColumn.name,
      this.field.cinchyColumn.dataProduct,
      this.field.cinchyColumn.tableName,
      this.form.rowId
    ).subscribe(
      {
        next: (results: Array<{ fileId: number, fileName: string }>) => {

          if (results?.length) {
            this.selectedValue = new DropdownOption(results[0].fileId?.toString(), results[0].fileName);

            const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
            const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", results[0].fileId?.toString());

            this.downloadableLinks = [
              {
                fileName: results[0].fileName,
                fileUrl: fileUrl,
                fileId: results[0].fileId
              }
            ];

            this.valueChanged();
          }
        }
      }
    );
  }


  async getListItems(updateList: boolean, fromLinkedField?: boolean): Promise<void> {

    if (
        !this.field.dropdownDataset?.options?.length ||
        this.field.dropdownDataset?.isDummy ||
        (!this.filteredOptions?.length && !this.autocompleteText && this.searchCharacterLimitMet)
    ) {
      this.isLoading = true;

      let dropdownDataset: DropdownDataset = null;
      let currentFieldJson: any;

      let tableColumnQuery: string = `
        SELECT
          tc.[Table].[Data Product].[Name] AS 'Data Product',
          tc.[Table].[Name] AS 'Table',
          tc.[Name] AS 'Column'
        FROM [Cinchy].[Cinchy].[Table Columns] tc
        WHERE tc.[Deleted] IS NULL
          AND tc.[Table].[Deleted] IS NULL
          AND tc.[Cinchy ID] = ${this.field.cinchyColumn.linkTargetColumnId};`;

      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData: any = JSON.parse(this.field.cinchyColumn.formFieldsJsonData);

      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }

      if (!isNullOrUndefined(this.field.cinchyColumn.linkTargetColumnId)) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(
          this.field.cinchyColumn.linkTargetColumnId,
          currentFieldJson,
          this.field.cinchyColumn.dropdownFilter,
          this.form.rowId,
          updateList
        );

        this.form.updateFieldAdditionalProperty(
          this.sectionIndex,
          this.fieldIndex,
          {
            propertyName: "dropdownDataset",
            propertyValue: this.getSortedList(dropdownDataset)
          }
        );

        this.charactersAfterWhichToShowList = this.field.dropdownDataset?.options?.length > 2000 ? 3 : 0;
        this.filteredOptions = this._filter(this.autocompleteText);

        if (fromLinkedField) {
          this._setValue(true);
        }
      }

      this.isLoading = false;
    }
  }


  /**
   * Removes options with empty labels from the given dataset, and then sorts the remaining options by label
   */
  getSortedList(dropdownDataset: DropdownDataset): DropdownDataset {

    if (dropdownDataset?.options?.length) {
      return new DropdownDataset(
        dropdownDataset.options.filter((option: DropdownOption) => {

          return coerceBooleanProperty(option.label);
        }).sort((a: DropdownOption, b: DropdownOption) => {

          const labelA = a.label?.toString()?.toLocaleLowerCase() ?? '';
          const labelB = b.label?.toString()?.toLocaleLowerCase() ?? '';

          return (labelA.localeCompare(labelB));
        }),
        dropdownDataset.isDummy
      );
    }

    return dropdownDataset;
  }


  onDeleteFile(): void {

    this.selectedValue = null;
    this.autocompleteText = "";

    this.downloadableLinks = [];

    this.valueChanged();
  }


  onFileSelected(event: Event): void {

    if ((event?.target as HTMLInputElement)?.files?.length) {
      if (this.form.rowId) {
        const uploadUrl: string = this._configService.envConfig.cinchyRootUrl +
          this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId.toString());

        this._cinchyQueryService.uploadFiles(Array.from((event.target as HTMLInputElement).files), uploadUrl).subscribe(
          {
            next: (): void => {

              this._notificationService.displaySuccessMessage("File Uploaded");

              this.fileInput.nativeElement.value = "";

              this.getAndSetLatestFileValue();
            },
            error: (): void => {

              this._notificationService.displayErrorMessage("Could not upload the file");
            }
          }
        );
      }
      else {
        this._notificationService.displayErrorMessage("No rowId was provided, so attempting to upload the selected file will result in an error");
      }
    }
    else {
      this._notificationService.displayWarningMessage("The application attempted to upload an empty file set.");

      console.warn(event);
    }
  }


  /**
   * Resolves the selectedValue when the user selects an option from the autocomplete. If the user uses the keyboard,
   * then a MatSelectChange event will be provided.
   */
  onOptionSelected(event: MatSelectChange, option: DropdownOption): void {

    // This function will also be called on the previously-selected value, if any, so we're just
    // checking to see if the given option is the one we care about
    if (event.source.selected) {
      // We don't need to explicitly set autocompleteText because the value of the selected option already does that
      this.selectedValue = option;

      this.valueChanged();
    }
  }


  async openNewOptionDialog(): Promise<void> {

    const form: Form = await this._formHelperService.getFormById(this.field.cinchyColumn.createLinkOptionFormId);

    const newOptionDialogRef = this._dialogService.openDialog(
      ChildFormComponent,
      {
        childForm: form,
        title: this.field.cinchyColumn.createLinkOptionName
      }
    );

    await this._spinnerService.hide();

    newOptionDialogRef.afterClosed().subscribe(async (resultId: number): Promise<void> => {

      // This check only exists to confirm that the dialog was closed by a save operation. If it was cancelled
      // or closed by clicking the backdrop, it will be nullish
      if (resultId) {
        await this._spinnerService.show();

        // Errors to this function are captured internally, so we can assume that it will complete naturally
        await this._formHelperService.addOptionToLinkedTable(form);

        await this._spinnerService.hide();
      }
    });
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


  removeTooltipElement(): void {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  /**
   * Resets the label to the selected value when the user blurs the input. The delay allows for dropdowns representing
   * large datasets to resolve their value before adjusting the text in the case that the user selects a value by
   * clicking, which would otherwise fire the blur event before the selection is saved.
   */
  setToLastValueSelected(): void {

    setTimeout(() => {

      this.autocompleteText = this.selectedValue?.label || "";
    }, 300);
  }


  setTooltipCursor(): void {

    this.isCursorIn = true;
  }


  setWhenNewRowAddedForParent(): void {

    this.form.updateFieldValue(
      this.sectionIndex,
      this.fieldIndex,
      this.form.rowId
    );

    this.isDisabled = true;
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.selectedValue?.id || null,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }

  /**
  * If the field is displaying an imaged, returns the class name associated with the configured format
  */
  get imageSize(): string {

    if (this.showImage) {
      switch (this.field.cinchyColumn.dataFormatType) {
        case DataFormatType.ImageUrlSmall:

          return "cinchy-images-small";
        case DataFormatType.ImageUrlLarge:

          return "cinchy-images-large";
        case DataFormatType.ImageUrlMedium:
          // falls through
        case DataFormatType.ImageUrl:

          return "cinchy-images";
        default:
          return "";
      }
    }

    return "";
  }


  private _filter(value: string): DropdownOption[] {

    if (this.field.dropdownDataset?.options?.length && this.searchCharacterLimitMet) {
      if (value) {
        // This is outside of the loop for performance reasons
        const lowercaseFilterValue = value.toLowerCase();

        return this.field.dropdownDataset.options.filter((option: DropdownOption) => {

          return (option.displayOnlyLabel || option.label)?.toString().toLowerCase()?.includes(lowercaseFilterValue);
        });
      }
      else {
        return this.field.dropdownDataset.options;
      }
    }

    return [];
  }


  /**
   * Sets the initial value of the control based on the field's value.
   *
   * @param fromGetListItems Used to ensure we won't get an infinite loop if getListItems isn't able to populate dataset
   */
  private _setValue(fromGetListItems?: boolean): void {

    const dataset: Array<DropdownOption> = this.field.dropdownDataset?.options || null;

    // If the dataset isn't populated yet, we won't be able to get the correct value, so we'll try to
    // populate it and then try again
    if (!dataset?.length && !fromGetListItems) {
      this.getListItems(true, true);
    }
    else {
      if (this.field.hasValue) {
        // Handles the case where there is a placeholder element (e.g. "Loading...")
        if (dataset?.length === 1) {
          this.selectedValue = { ...dataset[0] };
        }
        // Otherwise, searches the dataset for the option that matches the current selection
        else if (dataset?.length > 1) {
          this.selectedValue = dataset.find((option: DropdownOption) => {

            // We're explicitly using a double equals here because at this stage the ID may be either a number or string
            return (option.id == this.field.value);
          });
        }
        // If the field has a value but the dataset for some reason does not, use the previously-selected value, if any
        else {
          this.selectedValue = this.selectedValue ?? null;
        }
      }
      // If the field doesn't have a value, clear the selected value
      else {
        this.selectedValue = null;
      }

      this.autocompleteText = this.selectedValue?.label || "";

      this.valueChanged();

      this.checkForAttachmentUrl();
      this.checkForDisplayColumnFormatter();
    }
  }
}
