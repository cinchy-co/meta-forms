import { Injectable } from "@angular/core";
import { CinchyService, QueryType } from "@cinchy-co/angular-sdk";
import { ToastrService } from "ngx-toastr";
import { IFormFieldMetadata } from "src/app/models/form-field-metadata.model";
import { IFormMetadata } from "src/app/models/form-metadata-model";
import { IFormSectionMetadata } from "src/app/models/form-section-metadata.model";
import { ILookupRecord } from "src/app/models/lookup-record.model";
import { CinchyQueryService } from "src/app/services/cinchy-query.service";
import { CinchyColumn, ICinchyColumn } from "../../models/cinchy-column.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { FormSection } from "../../models/cinchy-form-sections.model";
import { Form, IForm } from "../../models/cinchy-form.model";
import { IQuery } from "../../models/cinchy-query.model";

@Injectable({
  providedIn: 'root',
})
export class FormHelperService {

  constructor(
    private _cinchyService: CinchyService,
    private _cinchyQueryService: CinchyQueryService,
    private _toastr: ToastrService
  ) { }

  public async generateForm(formMetadata: IFormMetadata, rowId: string | number,tableEntitlements: any, isChild: boolean = false, flatten: boolean = false, childFormParentId?: string, childFormLinkId?: string, childFormFilter?: string, childFormSort?: string, parentForm: IForm = null): Promise<IForm> {
    if (formMetadata == null)
      return null;

   // var tableEntitlements = await this._cinchyService.getTableEntitlementsById(formMetadata.tableId).toPromise();

    const result = new Form(
      formMetadata.formId,
      formMetadata.formName,
      formMetadata.tableId,
      formMetadata.domainName,
      formMetadata.tableName,
      formMetadata.isAccordion,
      tableEntitlements.accessIsDefinedForCurrentUser,
      isChild,
      flatten,
      childFormParentId,
      childFormLinkId,
      childFormFilter,
      childFormSort
    );

    result.tableMetadata = JSON.parse(formMetadata.tableJson);
    result.parentForm = parentForm
    result.rowId = rowId;
    return result;
  }

  public fillWithSections(form: IForm, formSectionsMetadata: IFormSectionMetadata[]) {
    form.sections = formSectionsMetadata.map(_ => {
      let result = new FormSection(_.id, _.name);
      result.columnsInRow = _.columnsInRow;
      result.autoExpand = _.autoExpand;
      return result;
    });
  }

  public async fillWithFields(form: IForm, cinchyId: string, formMetadata: IFormMetadata, formFieldsMetadata: IFormFieldMetadata[], selectedLookupRecord: ILookupRecord,tableEntitlements: any) {
    if (!formFieldsMetadata?.length)
      return;

    let tableJson = JSON.parse(formMetadata.tableJson);
    let formFields: IFormFieldMetadata[] = formFieldsMetadata.filter(_ => _.formId == form.id);

   // const tableEntitlements = await this._cinchyService.getTableEntitlementsById(formMetadata.tableId).toPromise();
    const cellEntitlements = await this.getCellEntitlements(formMetadata.domainName, formMetadata.tableName, cinchyId, formFields);

    let parentChildLinkedColumns: {[columnName: string]: FormField[]} = {};
    let parentFieldsByColumn: {[columnName: string]: FormField} = {};
    let allChildForms: IForm[] = [];

    let minSectionIter = 0;
    for (let i = 0; i < formFields.length; i++) {
      const columnMetadata = tableJson.Columns.find(_ => _.columnId === formFields[i].columnId);
      const columnEntitlements = tableEntitlements.columnEntitlements.find(_ => _.columnId === formFields[i].columnId);
      const columnEntitlementKey = columnEntitlements ? `entitlement-${columnEntitlements?.columnName.substring(0, 114)}` : '';
      const attachedFileName = await this.getFileName(cinchyId, formFields[i].fileNameColumn);
      
      if (columnMetadata?.dependencyColumnIds && columnMetadata?.dependencyColumnIds.length > 0){
        const parentMetadata = tableJson.Columns.find(_ => _.columnId === columnMetadata?.dependencyColumnIds[0]);
        columnMetadata.displayFormat = parentMetadata?.displayFormat;
       }


      const cinchyColumn: ICinchyColumn = new CinchyColumn(
        formFields[i].columnId,
        formMetadata.tableId,
        formMetadata.tableName,
        formMetadata.domainName,
        formFields[i].columnName,
        formFields[i].columnType,
        formFields[i].overrideMandatory ? false : formFields[i].columnIsMandatory,
        formFields[i].columnMaxLength,
        formFields[i].linkTargetColumnId,
        formFields[i].linkTargetColumnName,
        columnMetadata?.allowMultiple == null ? false : columnMetadata?.allowMultiple,
        columnMetadata?.validationExpression,
        columnMetadata?.minValue == null ? 0 : columnMetadata?.minValue,
        (columnEntitlements == null || cellEntitlements && cellEntitlements[columnEntitlementKey] === 0) ? false : columnEntitlements.canEdit,
        (columnEntitlements?.canView != null) ? columnEntitlements.canView : false,
        formFields[i].createlinkOptionFormId, 
        formFields[i].createlinkOptionName,
        formFields[i].linkTargetTableId,
        formFields[i].linkTargetTableName,
        '#dddddd',
        formFields[i].choiceOptions,
        formMetadata.tableJson,
        formFields[i].dataFormatType,
        false,
        formFields[i].viewOnly || formFields[i].isDisplayColumn,
        formFields[i].linkFieldId,
        formFields[i].isDisplayColumn,
        attachedFileName,
        formFields[i].fileNameColumn,
        formFields[i].dropdownFilter,
        formFields[i].totalTextAreaRows,
        formFields[i].numberFormatter,
        formFields[i].attachmentUrl,
        formFields[i].uploadUrl,
        formFields[i].childFormParentId,
        formFields[i].childFormLinkId,
        formFields[i].doNotWrap,
        columnMetadata?.displayFormat,
        columnMetadata?.$type == 'Calculated'
      );

      let childForm: IForm = null;
      const childFormId = formFields[i].childFormId;
      if (childFormId) {
        const displayColumnId = formFields[i].displayColumn.split(',').map(_ => parseInt(_, 10));
        displayColumnId.push(formFields[i].linkFieldId);
        
        const childFormMetadata = await this._cinchyQueryService.getFormMetadata(childFormId).toPromise();
        const childFormSectionsMetadata = await this._cinchyQueryService.getFormSections(childFormId).toPromise();
        let childFormFieldsMetadata = await this._cinchyQueryService.getFormFieldsMetadata(childFormId).toPromise();
        childFormFieldsMetadata = childFormFieldsMetadata.filter(_ => displayColumnId.find(id => id == _.formFieldId) != null);
        const childTableEntitlements = await this._cinchyService.getTableEntitlementsById(childFormMetadata.tableId).toPromise();
        childForm = await this.generateForm(childFormMetadata, null,childTableEntitlements, true, formFields[i].flattenChildForm, formFields[i].childFormParentId, formFields[i].childFormLinkId, formFields[i].childFormFilter, formFields[i].sortChildTable, form);
        this.fillWithSections(childForm, childFormSectionsMetadata);
        await this.fillWithFields(childForm, cinchyId, childFormMetadata, childFormFieldsMetadata, selectedLookupRecord,childTableEntitlements);
        await this.fillWithData(childForm, cinchyId, selectedLookupRecord, formMetadata.tableId, formMetadata.tableName, formMetadata.domainName);

        // Override these, they will be checked later when opening up the child form
        cinchyColumn.canEdit = true;
        cinchyColumn.canView = true;

        // If flatten, we have to check the entitlements for the last record and readjust the entitlements
        if (childForm.flatten && childForm.sections?.length && childForm.sections[0]['MultiFields'] && childForm.sections[0]['MultiFields'].length) {
          let childFormData = childForm.sections[0]['MultiFields'];
          let lastRecordId = childFormData[childFormData.length - 1]['Cinchy ID'];
          if (lastRecordId != null) {
          //  const childTableEntitlements = await this._cinchyService.getTableEntitlementsById(childFormMetadata.tableId).toPromise();
            const childCellEntitlements = await this.getCellEntitlements(childFormMetadata.domainName, childFormMetadata.tableName, lastRecordId, childFormFieldsMetadata);
            childForm.rowId = lastRecordId;
            if (childForm.sections) {
              for (let x = 0; x < childForm.sections.length; x++) {
                if (childForm.sections[x].fields?.length) {
                  for (let y = 0; y < childForm.sections[x].fields.length; y++) {
                    const childColumnEntitlements = childTableEntitlements.columnEntitlements.find(_ => _.columnId === childForm.sections[x].fields[y].cinchyColumn.id);
                    const childColumnEntitlementKey = childColumnEntitlements ? `entitlement-${childColumnEntitlements?.columnName.substring(0, 114)}` : '';

                    childForm.sections[x].fields[y].cinchyColumn.canEdit = (childColumnEntitlements == null || childCellEntitlements && childCellEntitlements[childColumnEntitlementKey] === 0) ? false : childColumnEntitlements.canEdit;
                    childForm.sections[x].fields[y].cinchyColumn.canView = (childColumnEntitlements?.canView != null) ? childColumnEntitlements.canView : false;
                  }
                }
              }
            }
          }
        }

        allChildForms.push(childForm);
      }

      const formField: FormField = new FormField(formFields[i].formFieldId, formFields[i].formFieldName, formFields[i].caption, childForm, cinchyColumn, null, form);

      if (childFormId == null)
        parentFieldsByColumn[cinchyColumn.name] = formField;

      for (let j = minSectionIter; j < form.sections.length; j++) {
        if (form.sections[j].id === formFields[i].formSectionId) {
          minSectionIter = j;
          form.sections[j].fields.push(formField);
          form.sections[j].childFilter = formFields[i].childFormFilter;
          form.sections[j].childSort = formFields[i].sortChildTable;
          break;
        }
      }
    }
    form.fieldsByColumnName = parentFieldsByColumn;

    for (let i = 0; i < allChildForms.length; i++) {
      if (allChildForms[i].childFormParentId && allChildForms[i].childFormLinkId) {
        let parentColName = this.parseColumnNameByChildFormLinkId(allChildForms[i].childFormParentId);
        let childColName = this.parseColumnNameByChildFormLinkId(allChildForms[i].childFormLinkId);
        
        if (parentColName != null && form.fieldsByColumnName[parentColName] != null && childColName != null && allChildForms[i].fieldsByColumnName[childColName] != null) {

          if (parentChildLinkedColumns[parentColName] == null)
            parentChildLinkedColumns[parentColName] = [];
          parentChildLinkedColumns[parentColName].push(allChildForms[i].fieldsByColumnName[childColName]);

          // If this is a flat child form, hide the link column otherwise it'll appear twice on the form
          if (allChildForms[i].flatten)
            allChildForms[i].fieldsByColumnName[childColName].hide = true;
        }
      }
    }

    form.childFieldsLinkedToColumnName = parentChildLinkedColumns;
  }

  private parseColumnNameByChildFormLinkId(formLinkId: string): string {
    if (formLinkId == null)
      return null;

    let splitColumnNames = formLinkId.split('].[');
    if (splitColumnNames?.length > 0) {
      let colName = splitColumnNames[0].replace(/[\[\]]+/g, '');
      return colName;
    }
    return null;
  }

  // TODO: Refactor to smaller function, remove the need to use afterChildFormEdit as a function, it's only a workaround for the bad existing code in cinchy-dynamic-forms.component.ts that handles child forms queries
  public async fillWithData(form: IForm, cinchyId: string, selectedLookupRecord: ILookupRecord, parentTableId?: number, parentTableName?: string, parentDomainName?: string, afterChildFormEdit?: Function) {
    if (cinchyId == null || cinchyId == 'null')
      return;

    const selectQuery: IQuery = form.generateSelectQuery(cinchyId, parentTableId);
    try {
      if (form.isChild && form.childFormParentId && form.childFormLinkId && parentDomainName && parentTableName) {
        const queryToGetMatchIdFromParent = `SELECT ${form.childFormParentId} AS 'idParent'
                                            FROM [${parentDomainName}].[${parentTableName}]
                                            WHERE [Cinchy Id] = ${cinchyId}`;
        let cinchyIdForMatchFromParentResp = (await this._cinchyService.executeCsql(queryToGetMatchIdFromParent, null, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();
        let idForParentMatch = cinchyIdForMatchFromParentResp?.length ? cinchyIdForMatchFromParentResp[0]['idParent'] : null;
        if (idForParentMatch) {
          if (selectQuery.params == null) {
            selectQuery.params = {};
          }
          selectQuery.params['@parentCinchyIdMatch'] = idForParentMatch;
        }
      }
      const selectQueryResult: Object[] =
        (await this._cinchyService.executeCsql(selectQuery.query, selectQuery.params, null, QueryType.DRAFT_QUERY).toPromise()).queryResult.toObjectArray();

      if (form.isChild) {
        form.loadMultiRecordData(cinchyId, selectQueryResult, selectedLookupRecord);
      }
      else {
        form.loadRecordData(cinchyId, selectQueryResult);
      }

      // Update the value of the child fields that are linked to a parent field (only for flattened child forms)
      if (form.childFieldsLinkedToColumnName != null) {
        for (let parentColName in form.childFieldsLinkedToColumnName) {

          let linkedParentField = form.fieldsByColumnName[parentColName];
          let linkedChildFields = form.childFieldsLinkedToColumnName[parentColName];

          if (linkedParentField == null || linkedChildFields.length === 0)
            continue;

          for (let linkedChildField of linkedChildFields) {
            // Skip non-flat child forms and skip if there's already a value or if it already matches the parent's value
            if (!linkedChildField.form.flatten || linkedChildField.value != null || linkedParentField.value == linkedChildField.value)
              continue;

            // Update the child form field's value
            linkedChildField.value = linkedParentField.value;
            linkedChildField.cinchyColumn.hasChanged = true;

            if (afterChildFormEdit) {
              afterChildFormEdit({
                'childFormId': linkedChildField.form.id,
                'data': linkedChildField.form,
                'id': 0
              }, linkedChildField.form);
            }
          }
        }
      }
    } catch (e) {
      console.error(e?.cinchyException?.message, e);
      if (e?.cinchyException?.message)
        this._toastr.error('Error while fetching data from the table. Please make sure you have the correct entitlements to view the data.', 'Error')
      else
        this._toastr.error(selectedLookupRecord ? e : 'Selected row is either deleted or doesn\'t exist.', 'Error');
    }
  }

  private async getCellEntitlements(domainName: string, tableName: string, cinchyId: string, formFieldsMetadata: IFormFieldMetadata[]): Promise<Object> {
    const selectClause = formFieldsMetadata
      .filter(_ => _.columnName)
      .map(_ => ` editable([${_.columnName}]) as 'entitlement-${_.columnName.substring(0, 114)}'`);

    const query = `
      SELECT ${selectClause.toString()}
      FROM [${domainName}].[${tableName}] t
      WHERE t.[Deleted] IS NULL
        AND t.[Cinchy Id]=${cinchyId};
    `;

    try {
      let response = await this._cinchyService.executeCsql(query, null).toPromise();
      return response.queryResult.toObjectArray()[0];
    } catch (e) {
      this._toastr.error('Error while checking the entitlements for the form fields. You may face issues upon saving the form.', 'Error');
    }
    return {};
  }

  private async getFileName(cinchyId: string, fileNameColumn: string) {
    const [domain, table, column] = fileNameColumn ? fileNameColumn.split('.') : [];
    const whereCondition = `WHERE [Cinchy Id] = ${cinchyId} AND [Deleted] IS NULL `;

    if (domain) {
      const query = `SELECT [${column}] as 'fullName',
                       [Cinchy Id] as 'id'
                     FROM
                       [${domain}].[${table}]
                       ${whereCondition}
      `;

      const fileNameResp = await this._cinchyService.executeCsql(query, null, null, QueryType.DRAFT_QUERY).toPromise();
      return fileNameResp && fileNameResp.queryResult && fileNameResp.queryResult.toObjectArray()[0] ?
        fileNameResp.queryResult.toObjectArray()[0]['fullName'] : null;
    }
  }
}