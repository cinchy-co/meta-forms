import { Injectable } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { DatePipe } from "@angular/common";

import { DropdownOption } from "../cinchy-dropdown-dataset/cinchy-dropdown-options";

import { DataFormatType } from "../../enums/data-format-type.enum";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { FormSection } from "../../models/cinchy-form-section.model";

import { ConfigService } from "../../../services/config.service";

import { NumeralPipe } from "ngx-numeral";
import { isNullOrUndefined } from "util";


/**
 * A utility service which helps manage child forms, including pre-rendering logic for display in tables
 */
@Injectable({
  providedIn: "root",
})
export class ChildFormService {

  constructor(
    private _configService: ConfigService,
    private _datePipe: DatePipe
  ) {}


  /**
   * @returns a flattened set of all fields displayed by the child form
   */
  getAllFields(childForm: Form): Array<FormField> {

    return childForm.sections.flatMap((section: FormSection) => {

      return section.fields;
    });
  }


  getDisplayValueMap(childForm: Form): Array<{ [key: string]: string }> {

    const displayValueSet = new Array<{ [key: string]: string }>();
    const fields = this.getAllFields(childForm);
    const fieldKeys = this.getFieldKeys(childForm);

    childForm.childFormRowValues?.forEach((rowData: { [key: string]: any }, rowIndex: number) => {

      displayValueSet[rowIndex] = {};

      fieldKeys.forEach((key: string) => {

        let currentField: FormField  = this.getFieldByKey(fields, key);

        if (!isNullOrUndefined(rowData[key])) {
          if (currentField?.cinchyColumn.dataType === "Date and Time") {
            let dateFormat = currentField.cinchyColumn.displayFormat;

            // TODO: this can be done using String.replaceAll when ES2021 is available (typescript ^4.5, angular ^14.0.7)
            dateFormat = dateFormat.replace(new RegExp("Y", "g"), "y");
            dateFormat = dateFormat.replace(new RegExp("D", "g"), "d");

            displayValueSet[rowIndex][key] = this._datePipe.transform(rowData[key], dateFormat);
          }
          else if (typeof rowData[key] === "boolean") {
            displayValueSet[rowIndex][key] = (rowData[key] === true) ? "Yes" : "No";
          }
          else if (currentField?.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl)) {
            displayValueSet[rowIndex][key] = `<img class="cinchy-images cinchy-images--min" src="${rowData[key]}">`;
          }
          else if (currentField?.cinchyColumn.numberFormatter) {
            const numeralValue = new NumeralPipe(rowData[key]);

            displayValueSet[rowIndex][key] = numeralValue.format(currentField.cinchyColumn.numberFormatter);
          }
          else if (currentField?.cinchyColumn.dataFormatType === "LinkUrl") {
            displayValueSet[rowIndex][key] = `<a href="${rowData[key]}" target="_blank">Open</a>`;
          }
          else if (currentField?.cinchyColumn.dataType === "Link" && rowData[key] && !currentField.cinchyColumn.isDisplayColumn) {
            let linkDisplayValues = new Array<string>();
            let isFile = coerceBooleanProperty(currentField.cinchyColumn.attachmentUrl);

            const ids: Array<string> = currentField.cinchyColumn.isMultiple ? rowData[key] : [rowData[key]];

            ids?.forEach((id: string) => {

              currentField.dropdownDataset?.options?.forEach((option: DropdownOption) => {

                // TODO: We're explicitly using a double equals here because at this stage the ID may be either a number or string depending on where it was
                //       populated. In the future we'll need to figure out which is correct and make sure we're using it consistently
                if (option.id == id) {
                  if (isFile) {
                    let replacedCinchyIdUrl = currentField.cinchyColumn.attachmentUrl.replace("@cinchyid", rowData["Cinchy ID"]);
                    let fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", option.id);

                    linkDisplayValues.push(`<a href="${fileUrl}" target="_blank">${option.label}</a>`);
                  } else {
                    linkDisplayValues.push(option.label);
                  }
                }
              });
            });

            if (!linkDisplayValues.length) {
              linkDisplayValues = ids;
            }

            displayValueSet[rowIndex][key] = linkDisplayValues.length ? linkDisplayValues.join(", ") : null;
          }
          else if (Array.isArray(rowData[key])) {
            displayValueSet[rowIndex][key] = rowData[key].join(', ');
          }
          else {
            displayValueSet[rowIndex][key] = rowData[`${key} label`]?.toString() || rowData[key]?.toString();
          }
        }
      });
    });

    return (displayValueSet ?? []);
  }


  /**
   * Retrieves the FormField which matches the given key
   */
  getFieldByKey(fieldSet: Array<FormField>, key: string): FormField {

    // If there is a specific display column, use that field
    let currentField: FormField = fieldSet.find((field: FormField) => {

      return (`${field.cinchyColumn.linkTargetColumnName} label` === key);
    });

    // Otherwise, try to find the base field
    if (!currentField) {
      currentField = fieldSet.find((field: FormField) => {

        return (field.label === key);
      });
    }

    // If the field name doesn't match the target, then fall back to the cinchy column
    if (!currentField) {
      currentField = fieldSet.find((field: FormField) => {

        return (field.cinchyColumn.name === key);
      });
    }

    return currentField;
  }


  /**
   * Gets a set of all available columns to be displayed for the given form
   */
  getFieldKeys(childForm: Form): Array<string> {

    return (childForm.childFormRowValues?.length ? Object.keys(childForm.childFormRowValues[0]) : new Array<string>());
  }
}
