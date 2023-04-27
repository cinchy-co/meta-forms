import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";

import { CinchyService, QueryType } from "@cinchy-co/angular-sdk";
import { NgxSpinnerService } from "ngx-spinner";
import { ToastrService } from "ngx-toastr";
import { isNullOrUndefined } from "util";

import { MessageDialogComponent } from "./message-dialog/message-dialog.component";

import { ChildFormComponent } from "./fields/child-form/child-form.component";

import { ConfigService } from "../services/config.service";

import { Form } from "./models/cinchy-form.model";
import { FormField } from "./models/cinchy-form-field.model";
import { FormSection } from "./models/cinchy-form-section.model";
import { IQuery } from "./models/cinchy-query.model";

import { IFormFieldMetadata } from "../models/form-field-metadata.model";
import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";
import { ILookupRecord } from "../models/lookup-record.model";

import { SearchDropdownComponent } from "../shared/search-dropdown/search-dropdown.component";

import { AppStateService } from "../services/app-state.service";
import { CinchyQueryService } from "../services/cinchy-query.service";
import { FormHelperService } from "./service/form-helper/form-helper.service";
import { PrintService } from "./service/print/print.service";
import { IFieldChangedEvent } from "./interface/field-changed-event";



@Component({
  selector: "cinchy-dynamic-forms",
  templateUrl: "./cinchy-dynamic-forms.component.html",
  styleUrls: ["./style/style.scss"],
  encapsulation: ViewEncapsulation.None
})
export class CinchyDynamicFormsComponent implements OnInit, OnChanges {

  @ViewChild("recordDropdown") dropdownComponent: SearchDropdownComponent;
  
  @Input() formId: string;
  @Input() formMetadata: IFormMetadata;
  @Input() formSectionsMetadata: IFormSectionMetadata[];
  @Input() addNewFromSideNav: boolean;

  @Input("lookupRecords") set lookupRecords(value: ILookupRecord[]) { this.setLookupRecords(value); }
  lookupRecordsList: ILookupRecord[];

  @Output() closeAddNewDialog = new EventEmitter<any>();
  @Output() onLookupRecordFilter: EventEmitter<string> = new EventEmitter<string>();


  form: Form = null;
  rowId: number;
  fieldsWithErrors: Array<any>;
  currentRow: ILookupRecord;
  isCloneForm: boolean = false;

  enableSaveBtn: boolean = false;
  formHasDataLoaded: boolean = false;
  isLoadingForm: boolean = false;


  get lookupRecordsListPopulated(): boolean {

    return (this.lookupRecordsList?.length && this.lookupRecordsList[0].id !== -1);
  }

  private _queuedRecordSelection: { cinchyId: number | null, doNotReloadForm: boolean };


  private childDataForm = [];
  private childCinchyId = -1;
  private childFieldArray: Array<any> = [];
  private childForms: any;


  constructor(
    private _dialog: MatDialog,
    private _cinchyService: CinchyService,
    private _toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private appStateService: AppStateService,
    private cinchyQueryService: CinchyQueryService,
    private printService: PrintService,
    private _formHelperService: FormHelperService,
    private _configService: ConfigService
  ) {}


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.lookupRecords?.currentValue?.length) {
      if (this._queuedRecordSelection) {
        this._handleRecordSelection(this._queuedRecordSelection);
        this._queuedRecordSelection = null;
      }

      if (!this.formHasDataLoaded) {
        this.loadForm();
      }
    }
  }


  ngOnInit(): void {

    // Intialize with a loading state in case the first load takes some time
    this.lookupRecordsList = [{ id: -1, label: "Loading..." }];

    this.appStateService.saveClicked$.subscribe((saveClicked) => {

      this.saveForm(this.form, this.rowId);
    });

    this.appStateService.onRecordSelected$.subscribe(
      (record: { cinchyId: number | null, doNotReloadForm: boolean }) => {

        if (this.lookupRecordsListPopulated) {
          this._handleRecordSelection(record);
        }
        else {
          this._queuedRecordSelection = record;
        }
      }
    );
  }


  rowSelected(row: ILookupRecord): void {

    this.currentRow = row ?? this.currentRow;
    this.appStateService.setRecordSelected(row?.id ?? this.rowId);
  }


  setLookupRecords(lookupRecords: ILookupRecord[]): void {

    this.lookupRecordsList = this.checkNoRecord(lookupRecords);
  }


  checkNoRecord(lookupRecords: ILookupRecord[]): ILookupRecord[]{

    if (lookupRecords?.length > 0) {
      return lookupRecords;
    }
    else{
      return [{id: -1, label: "No records available"}];
    }
  }


  handleOnFilter(filterText: string): void {

    this.onLookupRecordFilter.emit(filterText);
  }


  setNewRow(newIndex: number): void {

    const newSelectedRow = this.lookupRecordsList[newIndex];

    this.currentRow = newSelectedRow;
    this.rowSelected(newSelectedRow);
  }


  //#region Edit Add Child Form Data
  async openChildForm(data) {

    if (!this.isCloneForm && !this.rowId) {
      const formvalidation = this.form.checkFormValidation();
      if (formvalidation) {
        this.saveForm(this.form, this.rowId, data);
      }
    } else {
      this.openChildDialog(data);
    }
  }


  afterChildFormEdit(eventData, childForm): void {

    this.childForms = childForm;

    if (isNullOrUndefined(eventData)) {
      return;
    }

    if (isNullOrUndefined(childForm.sections.multiFields)) {
      childForm.sections.multiFields = [];
    }

    const childResult = {};
    const childResultForLocal = {};
    const formvalidation = eventData.data.checkChildFormValidation();

    if (formvalidation.status) {
      eventData.data.sections.forEach(section => {

        if (isNullOrUndefined(section.multiFields)) {
          section.multiFields = [];
        }

        const fieldRow = section.multiFields.filter(rowData => {
          if (rowData["Cinchy ID"] === eventData.id) {
            return rowData;
          }
        });

        // Check for the record is new or in edit mode
        const childFieldRow = this.childFieldArray.filter((rowData) => {

          if (rowData["Cinchy ID"] === eventData.id) {
            return rowData;
          }
        });

        if (fieldRow.length > 0) {
          // if the code is in edit mode
          section.fields.forEach((element) => {

            if (element.cinchyColumn.dataType === "Link") {
              if (!isNullOrUndefined(element.dropdownDataset)) {
                let dropdownResult;

                if (element.cinchyColumn.isMultiple) {
                  const elementValues = element.value?.toString().split(",").map(_ => _.trim());

                  dropdownResult = elementValues ? 
                    element.dropdownDataset.options.filter(option => elementValues.find(eleVal => eleVal == option.id)) : 
                    [];

                  if (!dropdownResult?.length) {
                    dropdownResult = [element.dropdownDataset.options.find(e => e.id == element.value)].filter(_ => _);
                  }
                } else {
                  dropdownResult = [element.dropdownDataset.options.find(e => e.id === element.value)].filter(_ => _);
                }

                if (dropdownResult?.length && dropdownResult[0]) {
                  fieldRow[0][element.cinchyColumn.name] = dropdownResult.map(item => item.label).join(", ");
                } else {
                  fieldRow[0][element.cinchyColumn.name] = "";
                }
              }
            } else {
              fieldRow[0][element.cinchyColumn.name] = element.value;
            }
          });
        } else {
          // if the code is in add mode.
          section.fields.forEach((element) => {

            if ((element.cinchyColumn.dataType === "Link") && element.cinchyColumn.isMultiple) {
              if (element.dropdownDataset?.options) {                
                let dropdownResult;
                // Still checking for string as it can be an array too
                const elementValues = element.value?.toString().split(",").map(_ => _.trim());

                dropdownResult = elementValues ? element.dropdownDataset.options.filter(option => elementValues.find(eleVal => eleVal == option.id)) : [];

                if (dropdownResult && dropdownResult.length) {
                  childResult[element.cinchyColumn.name] = element.value;
                  childResult[element.cinchyColumn.name + " label"] = dropdownResult.map(item => item.label).join(",");
                  childResultForLocal[element.cinchyColumn.name] = dropdownResult.map(item => item.label).join(",");
                } else {
                  childResultForLocal[element.cinchyColumn.name] = "";
                }
              } else {
                childResult[element.cinchyColumn.name] = element.value;
                childResultForLocal[element.cinchyColumn.name] = element.value;
              }
            } else if (element.cinchyColumn.dataType === "Link" || element.cinchyColumn.dataType === "Choice") {
              if (!isNullOrUndefined(element.dropdownDataset) && element.dropdownDataset.options) {
                const dropdownResult = element.dropdownDataset.options.find(e => e.id === element.value);

                if (!isNullOrUndefined(dropdownResult)) {
                  childResult[element.cinchyColumn.name] = dropdownResult.id;
                  childResult[element.cinchyColumn.name + " label"] = dropdownResult.label;
                  childResultForLocal[element.cinchyColumn.name] = dropdownResult.label;
                } else {
                  childResultForLocal[element.cinchyColumn.name] = "";
                }
              } else {
                childResult[element.cinchyColumn.name] = element.value;
                childResultForLocal[element.cinchyColumn.name] = element.value;
              }
            } else if (element.cinchyColumn.dataType === "Binary") {
              childResult[element.cinchyColumn.name] = element.value;
              childResultForLocal[element.cinchyColumn.name] = element.value;

              const keyForBinary = element.cinchyColumn.name + "_Name";

              childResult[keyForBinary] = element.cinchyColumn.FileName;
              childResultForLocal[keyForBinary] = element.cinchyColumn.FileName;
            } else {
              childResult[element.cinchyColumn.name] = element.value;
              childResultForLocal[element.cinchyColumn.name] = element.value;
            }

            if (element.cinchyColumn.dataType === "Yes/No") {
              if (element.value === "" || isNullOrUndefined(element.value)) {
                element.value = false;
                childResult[element.cinchyColumn.name] = false;
                childResultForLocal[element.cinchyColumn.name] = false;
              }
            }
          });

          // create a random cinchy id for the local storage.
          const random = eventData.id = Math.random();

          childResultForLocal["Cinchy ID"] = random;
          childResult["Cinchy ID"] = random;

          // store child form data in local storage.
          this.childFieldArray.push(childResult);

          section.multiFields.push(childResultForLocal);
        }

        if (childFieldRow.length > 0) {
          section.fields.forEach(element => {
            if (element.cinchyColumn.dataType === "Link") {
              if (!isNullOrUndefined(element.dropdownDataset) && element.dropdownDataset.options) {
                const dropdownResult = element.dropdownDataset.options.find(e => e.id === element.value);

                if (!isNullOrUndefined(dropdownResult)) {
                  childFieldRow[0][element.cinchyColumn.name + " label"] = dropdownResult.label;
                  childFieldRow[0][element.cinchyColumn.name] = dropdownResult.id;
                } else {
                  childFieldRow[0][element.cinchyColumn.name] = "";
                }
              }
            } else {
              childFieldRow[0][element.cinchyColumn.name] = element.value;
            }
          });
        }
      });

      const _cinchyid = eventData.id;
      const _childFormId = `${_cinchyid}-${eventData.childFormId}`;

      if (eventData.id < 1) {
        eventData.id = null;
      }

      const insertQuery: IQuery = eventData.data.generateSaveForChildQuery(eventData.id, this.isCloneForm);

      // Generate insert query for child form
      const queryResult = {
        id: _cinchyid,
        Query: insertQuery,
        result: eventData.data,
        childFormId: _childFormId
      };

      // check query for add/edit mode
      const _query = this.childDataForm.filter(x => x.childFormId === _childFormId);

      if (_query.length > 0) { // Issue was when both child rows have same ID it was overriding it, that"s why using uniquee childFormId
        _query[0].Query = insertQuery;
      } else {
        // create a collection of queries for child form
        this.childDataForm.push(queryResult);
      }
      this.childCinchyId = eventData.id;
    }
  }


  openChildDialog(data): void {

    const dialogData = { ...data, rowId: this.rowId };
    const dialogRef = this._dialog.open(ChildFormComponent, {
      width: "500px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      this.afterChildFormEdit(result, data.multiFieldValues);
    });
  }
  //#endregion


  //#region
  /**
   * Uses the metadata from Cinchy to create and load the Form object, then it"ll fill it with the form object with actual data
   * Gets called upon load, save, and row changes
   */
  async loadForm(childData?: any): Promise<void> {

    this.isCloneForm = false;
    this.childDataForm = [];
    this.formHasDataLoaded = false;
    this.enableSaveBtn = false;

    this.isLoadingForm = true;

    try {
      let tableEntitlements = await this._cinchyService.getTableEntitlementsById(this.formMetadata.tableId).toPromise();

      const form = await this._formHelperService.generateForm(this.formMetadata, this.rowId, tableEntitlements);

      form.populateSectionsFromFormMetadata(this.formSectionsMetadata);

      this.cinchyQueryService.getFormFieldsMetadata(this.formId).subscribe(
        async (formFieldsMetadata: Array<IFormFieldMetadata>) => {

          if (this.lookupRecordsListPopulated) {
            const selectedLookupRecord = this.lookupRecordsList.find((record: ILookupRecord) => {

              return (record.id === this.rowId);
            });

            await this._formHelperService.fillWithFields(form, this.rowId, this.formMetadata, formFieldsMetadata, selectedLookupRecord,tableEntitlements);

            // This may occur if the rowId is not provided in the queryParams, but one is available in the session
            if (this.rowId !== null) {
              if (!selectedLookupRecord) {
                this.appStateService.setRecordSelected(null);
              }
              else {
                await this._formHelperService.fillWithData(form, this.rowId, selectedLookupRecord, null, null, null, this.afterChildFormEdit.bind(this));
              }
            }

            this.form = form;

            this.enableSaveBtn = true;

            this.isLoadingForm = false;
            this.formHasDataLoaded = true;
         
            this.spinner.hide();

            if (childData) {
              setTimeout(() => {

                childData.rowId = this.rowId;

                this.appStateService.setOpenOfChildFormAfterParentSave(childData);
              }, 500);
            }
          }
        },
        error => {

          this.spinner.hide();

          console.error(error);
        });
    } catch (e) {
      this.spinner.hide();

      console.error(e);
    }
  }
  //#endregion


  //#region  Save Values of MetaData
  public async saveForm(formData: Form, rowId: number, childData?): Promise<void> {

    if (formData) {
      // check validations for the form eg: Required, Regular expression
      const formvalidation = formData.checkFormValidation();

      if (formvalidation.status) {      
        // Generate dynamic query using dynamic form meta data
        this.spinner.show();
        const insertQuery: IQuery = formData.generateSaveQuery(rowId, this._configService.cinchyVersion, this.isCloneForm);

        // execute dynamic query
        if (insertQuery) {
          if (insertQuery.query) {
            this._cinchyService.executeCsql(insertQuery.query, insertQuery.params).subscribe(
              response => {

                this.spinner.hide();

                if (isNullOrUndefined(this.rowId)) {
                  this.appStateService.setRecordSelected(response.queryResult._jsonResult.data[0][0], true);
                  this.isCloneForm = false;
                }

                this.saveMethodLogic(this.rowId, response, childData);
                this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);

                this._toastr.success("Data Saved Successfully", "Success");

                if (this.addNewFromSideNav) {
                  this.closeAddNewDialog.emit(this.rowId);
                }

                formData.hasChanged = false;
                this.appStateService.hasFormChanged = false;
              },
              error => {
                console.error("Error in cinchy-dynamic-forms save method", error);

                this._toastr.error("Error while updating file data.", "Error");
                this.spinner.hide();
              });
          }
          else if (insertQuery.attachedFilesInfo && insertQuery.attachedFilesInfo.length) {
            this.updateFileAndSaveFileNames(insertQuery.attachedFilesInfo);
          }
        }
        else {
          this.saveMethodLogic(this.rowId, null);
        }
      }
      else {
        this.fieldsWithErrors = formData.errorFields;
        this._toastr.warning(formvalidation.message, "Warning");
      }
    }

  }


  private updateFileAndSaveFileNames(attachedFilesInfo): void {

    attachedFilesInfo.forEach(async (fileDetails) => {
      const params = {
        "@p0": fileDetails.fileName
      };

      if (fileDetails.query) {
        const childCinchyId = fileDetails.childCinchyId;
        const fileQuery = `update t
                           set [${fileDetails.column}] = @p0
                           from [${fileDetails.domain}].[${fileDetails.table}] t
                           where t.[Cinchy Id] = ${childCinchyId ? childCinchyId : this.rowId} and t.[Deleted] is null`;
        const updateParams = {
          "@rowId": childCinchyId ? childCinchyId : this.rowId,
          "@fieldValue": fileDetails.value
        };

        try {
          await this._cinchyService.executeCsql(fileDetails.query, updateParams).toPromise();
          await this._cinchyService.executeCsql(fileQuery, params).toPromise();

          this._toastr.success("Saved successfully", "Success");

          this.spinner.hide();
        } catch (e) {
          this._toastr.error("Error while updating file data.", "Error");

          this.spinner.hide();
        }
      } else {
        const query = `update t
                       set [${fileDetails.column}] = @p0
                       from [${fileDetails.domain}].[${fileDetails.table}] t
                       where t.[Cinchy Id] = ${this.rowId} and t.[Deleted] is null`;

        await this._cinchyService.executeCsql(query, params).toPromise();
      }
    });
  }


  private async saveMethodLogic(rowId: number, response, childData?): Promise<number> {

    if (response?.queryResult._jsonResult.data.length > 0) {
      rowId = response.queryResult._jsonResult.data[0][0];
    } else {
      rowId = this.rowId;
    }
     
    if (this.childCinchyId !== -1) {
      await this.saveChildForm(rowId, 0);
    } else {
      this.spinner.hide();

      if (!isNullOrUndefined(this.rowId)) {
        this.loadForm(childData);
      }

      if (!response) {
        this._toastr.warning("No changes were made", "Warning");
      }
    }

    return rowId;
  }
  //#endregion


  //#region save Child Form Values
  public async saveChildForm(rowId: number, idx): Promise<void> {

    return new Promise((resolve, reject) => {

      if (!this.childDataForm.length && !isNullOrUndefined(this.rowId)) {
        this.loadForm();

        resolve();
      }
      else if (this.childDataForm.length <= idx) {
        resolve();
      }
      else {
        this.spinner.show();
        const element = this.childDataForm[idx];

        if (element.Query.query) {
          element.Query.query = element.Query.query.replace("{sourceid}", rowId.toString());
          const params = JSON.stringify(element.Query.params).replace("{sourceid}", rowId.toString());
          this._cinchyService.executeCsql(element.Query.query, JSON.parse(params)).subscribe(
            async () => {

              this.spinner.hide();

              await this.saveChildForm(rowId, idx + 1);

              this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);

              if (this.childDataForm.length === (idx + 1)) {
                await this.getchildSavedData(rowId);

                this.childDataForm = [];
                this.childCinchyId = -1;
                this._toastr.success("Child form saved successfully", "Success");
              }

              resolve();
            },
            error => {
              this.spinner.hide();
              this._toastr.error("Error while saving child form", "Error");

              reject(error);
            });
        } else {
          this.updateFileAndSaveFileNames(element.Query.attachedFilesInfo);

          resolve();
        }
      }
    });
  }
  //#endregion


  //#region Get Child Form Data After Save in Database
  public async getchildSavedData(rowID): Promise<void> {

    this.spinner.show();

    const selectQuery: IQuery = this.childForms.generateSelectQuery(rowID, this.formMetadata.tableId);

    if (this.childForms.childFormParentId && this.childForms.childFormLinkId) {
      const queryToGetMatchIdFromParent = `SELECT TOP 1 ${this.childForms.childFormParentId} as "idParent"
                                           FROM [${this.formMetadata.domainName}].[${this.formMetadata.tableName}]
                                           WHERE [Cinchy Id] = ${this.rowId}`;

      let cinchyIdForMatchFromParentResp = (await this._cinchyService.executeCsql(queryToGetMatchIdFromParent, null, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();

      let idForParentMatch = cinchyIdForMatchFromParentResp[0]["idParent"];

      if (idForParentMatch) {
        if (selectQuery.params == null) {
          selectQuery.params = {};
        }
        selectQuery.params["@parentCinchyIdMatch"] = idForParentMatch;
      }
    }

    const selectQueryResult: Object[] = (
      await this._cinchyService.executeCsql(
        selectQuery.query,
        selectQuery.params,
        null,
        QueryType.DRAFT_QUERY
      ).toPromise()
    ).queryResult.toObjectArray();

    this.spinner.hide();
    this.childForms.loadMultiRecordData(rowID, selectQueryResult);
  }


  /**
   * Handles
   */
  handleFieldsEvent(event: IFieldChangedEvent): void {

    event.form.updateFieldValue(event.sectionIndex, event.fieldIndex, event.newValue);

    // flattened child form
    if (event.form.isChild && event.form.flatten) {
      // If contains a record
      if (event.form.hasFields) {
        this.afterChildFormEdit({
          "childFormId": event.form.id,
          "data": event.form,
          "id": (event.form.sections[0].multiFields?.length && event.form.sections[0].multiFields[event.form.sections[0].multiFields.length - 1]["Cinchy ID"] != null) ? 
            event.form.sections[0].multiFields[event.form.sections[0].multiFields.length - 1]["Cinchy ID"] : 
            0
        }, event.form);
      }
    }

    if (event.targetColumnName && event.form.childFieldsLinkedToColumnName && event.form.childFieldsLinkedToColumnName[event.targetColumnName]) {
      for (let linkedFormField of event.form.childFieldsLinkedToColumnName[event.targetColumnName]) {
        if (linkedFormField.form.isChild && linkedFormField.form.flatten) {
          linkedFormField.value = event.newValue;
          linkedFormField.cinchyColumn.hasChanged = true;

          this.afterChildFormEdit({
            "childFormId": linkedFormField.form.id,
            "data": linkedFormField.form,
            "id": linkedFormField.form.sections[0].multiFields?.length && linkedFormField.form.sections[0].multiFields[linkedFormField.form.sections[0].multiFields.length - 1]["Cinchy ID"] != null ? 
            linkedFormField.form.sections[0].multiFields[linkedFormField.form.sections[0].multiFields.length - 1]["Cinchy ID"] : 
              0
          }, linkedFormField.form);
        }
      }
    }
  }


  openDeleteConfirm(data): void {

    const { domain, table, field, multiarray } = data;

    const dialogRef = this._dialog.open(MessageDialogComponent, {
      width: "400px",
      data: {
        title: "Please confirm",
        message: "Are you sure you want to delete this record ?"
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === "Yes") {
        if (!isNullOrUndefined(field["Cinchy ID"])) {
          const id = field["Cinchy ID"];

          if (field["Cinchy ID"] > 0) {
            // Query to delete record by Cinchy ID
            let query = `delete
                         from [${domain}].[${table}]
                         where
                             [Cinchy Id] = ${id}
                           and [Deleted] is null`;

            this._cinchyService.executeCsql(query, null).subscribe(
              () => {
                const idx = multiarray.indexOf(field);
                if (idx > -1) {
                  multiarray.splice(idx, 1);
                  // Remove record from local collection.
                  this.childDataForm = this.childDataForm.filter(
                    x => x.id !== id
                  );
                  this.childFieldArray = this.childFieldArray.filter(
                    x => x["Cinchy ID"] !== id
                  );
                  this._toastr.success(
                    "Record deleted successfully",
                    "Success"
                  );
                }
              },
              () => {
                this.spinner.hide();
              }
            );
          } else {
            const idx = multiarray.indexOf(field);

            if (idx > -1) {
              multiarray.splice(idx, 1);

              this.childDataForm = this.childDataForm.filter(x => x.id !== id);
              this.childFieldArray = this.childFieldArray.filter(

                x => x["Cinchy ID"] !== id
              );

              this._toastr.success("Record deleted successfully", "Success");
            }
          }
        } else {
          const idx = multiarray.indexOf(field);

          if (idx > -1) {
            multiarray.splice(idx, 1);
          }
        }
      }
    });
  }


  printCurrentForm(): void {

    this.printService.generatePdf(this.form, this.currentRow);
  }


  cloneFormData(): void {

    this.isCloneForm = true;
    this.form.rowId = null;
    this.rowId = null;
    this.childDataForm = [];

    let showWarningAboutChildFormDuplication = true;

    this.form.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        if (field.cinchyColumn) {
          field.cinchyColumn.hasChanged = true;
        }

        if (field.childForm != null) {
          field.childForm.rowId = null;
          field.childForm.id = "-1";

          if (field.childForm.sections && field.childForm.sections[0].multiFields) {
            if (field.childForm.childFormLinkId && field.childForm.childFormParentId) {
              if (!field.childForm.flatten && showWarningAboutChildFormDuplication) {
                showWarningAboutChildFormDuplication = false;

                this._toastr.warning("This cloned record contains child records that were also cloned, please ensure the field used to link is updated accordingly.", "Warning", { timeOut: 15000, extendedTimeOut: 15000 });
              }

              let childRecordsToClone = field.childForm.flatten ? 
                                        [field.childForm.sections[0].multiFields[field.childForm.sections[0].multiFields.length - 1]] :
                                        field.childForm.sections[0].multiFields;

              let startingCloneRecordIdx = field.childForm.flatten ? childRecordsToClone.length - 1 : 0;
              let numOfRecordsToClone = field.childForm.flatten ? 1 : childRecordsToClone.length;

              childRecordsToClone.forEach((childFormRecord) => {

                childFormRecord["Cinchy ID"] = Math.random();

                field.childForm.sections.forEach((childFormSection) => {

                  childFormSection.fields?.forEach((childFormField) => {

                    if (childFormField.cinchyColumn)
                      childFormField.cinchyColumn.hasChanged = true;

                    if (childFormField.cinchyColumn.dataType === "Link" && childFormField["dropdownDataset"] && childFormRecord[childFormField.cinchyColumn.name]) {
                      if (childFormField.cinchyColumn.isMultiple) {
                        const fieldValueLabels = childFormRecord[childFormField.cinchyColumn.name].split(",");
                        const trimedValues = fieldValueLabels?.length ? fieldValueLabels.map(label => label.trim()) : fieldValueLabels;
      
                        let multiDropdownResult = childFormField["dropdownDataset"].options.filter(e => trimedValues.indexOf(e.label) > -1);

                        // Hack for non-flattened child forms, for whatever reason, the dropdownDataset ends up being populated with the values of the child form records
                        if (!childFormField.form.flatten && !multiDropdownResult?.length) {
                          let unflattedMultiDropdownResult = childFormField["dropdownDataset"].options.find(e => e.label == childFormRecord[childFormField.cinchyColumn.name]);

                          multiDropdownResult = unflattedMultiDropdownResult ? [unflattedMultiDropdownResult] : multiDropdownResult;
                        }

                        childFormField.value = multiDropdownResult?.length ? 
                                               multiDropdownResult.map(item => item.id).join(", ") :
                                               childFormRecord[childFormField.cinchyColumn.name];
                      } else {
                        let singleDropdownResult = childFormField["dropdownDataset"].options.find(e => e.label == childFormRecord[childFormField.cinchyColumn.name]);

                        childFormField.value = singleDropdownResult ? singleDropdownResult.id : childFormRecord[childFormField.cinchyColumn.name];
                      }
                    } else if (childFormField.cinchyColumn.dataType === "Choice" && childFormField.cinchyColumn.isMultiple && childFormRecord[childFormField.cinchyColumn.name]) {
                      const fieldValueLabels = typeof childFormRecord[childFormField.cinchyColumn.name] === "string" ? childFormRecord[childFormField.cinchyColumn.name].split(",") : childFormRecord[childFormField.cinchyColumn.name];

                      childFormField.value = fieldValueLabels?.length ? fieldValueLabels.map(label => label.trim()) : childFormRecord[childFormField.cinchyColumn.name];
                    } else {
                      childFormField.value = childFormRecord[childFormField.cinchyColumn.name] ?? null;
                    }
                  });
                });

                this.afterChildFormEdit({
                  "childFormId": field.childForm.id,
                  "data": field.childForm,
                  "id": 0
                }, field.childForm);
              });

              field.childForm.sections[0].multiFields.splice(startingCloneRecordIdx, numOfRecordsToClone);
            }
            else 
            {
              field.childForm.sections[0].multiFields.splice(0, field.childForm.sections[0].multiFields.length);
            }
          };
        }
      });
    });

    this._toastr.info("The record was cloned, please save in order to create it.", "Info", { timeOut: 15000, extendedTimeOut: 15000 });
  }


  /**
   * Ingests the selected record and populates the form accordingly
   */
  private _handleRecordSelection(record: { cinchyId: number | null, doNotReloadForm: boolean }) {

    this.rowId = record?.cinchyId;

    if (this.rowId) {
      this.setLookupRecords(this.lookupRecordsList);
      this.currentRow = this.lookupRecordsList?.find(item => item.id === this.rowId) ?? this.currentRow ?? null;
    }
    else {
      this.currentRow = null;
    }

    if (!record?.doNotReloadForm) {
      this.loadForm();
    }
  }
}
