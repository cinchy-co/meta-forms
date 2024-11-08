import { DataFormatType } from "../enums/data-format-type.enum";
import { TextFormatType } from "../enums/text-format-type.enum";


export class CinchyColumn {
  hasChanged = false;

  constructor(
    public id: number,
    public tableId: number,
    public tableName: string,
    public dataProduct: string,
    public name?: string,
    public dataType?: string,
    public isMandatory?: boolean,
    public textColumnMaxLength?: number,
    public linkTargetColumnId?: number,
    public linkTargetColumnName?: string,
    public isMultiple?: boolean,
    public validationExpression?: string,
    public minValue?: number,
    public canEdit?: boolean,
    public canView?: boolean,
    public createLinkOptionFormId?: string,
    public createLinkOptionName?: string,
    public linkTargetTableId?: number,
    public linkTargetTableName?: string,
    public linkTableDataProductName?: string,
    public deviationSeverityColor?: string,
    public choiceOptions?: string,
    public formFieldsJsonData?,
    public dataFormatType?: DataFormatType,
    public isViewOnly?: boolean,
    public linkedFieldId?: any,
    public isDisplayColumn?: boolean,
    public fileName?: string,
    public fileNameColumn?: any,
    public dropdownFilter?: any,
    public totalTextAreaRows?: number,
    public numberFormatter?: string,
    public attachmentUrl?: string,
    public uploadUrl?: string,
    public childFormParentId?: string,
    public childFormLinkId?: string,
    public doNotWrap?: boolean,
    public displayFormat?: string,
    public textFormat?: TextFormatType,
    public label?: string
  ) {}
}
