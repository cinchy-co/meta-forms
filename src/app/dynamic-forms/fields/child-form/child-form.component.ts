import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { NotificationService } from "../../../services/notification.service";

import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { FormSection } from "../../models/cinchy-form-section.model";

import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";

import { IFieldChangedEvent } from "../../interface/field-changed-event";


/**
 * This dialog is used to display a nested form outside the context of the active form. Typically, this
 * is used to add an additional record to a table that populates a field on the active form
 */
@Component({
  selector: "cinchy-child-form",
  templateUrl: "./child-form.component.html",
  styleUrls: ["./child-form.component.scss"],
  providers: [DropdownDatasetService]
})
export class ChildFormComponent implements OnInit {

  constructor(
    private _notificationService: NotificationService,
    public dialogRef: MatDialogRef<ChildFormComponent>,
    @Inject(MAT_DIALOG_DATA) public childFormData: {
      childForm: Form,
      presetValues?: { [key: string]: any },
      useLimitedFields: boolean,
      title: string
    }
  ) {}


  ngOnInit(): void {

    const childFormLinkName = this.childFormData.childForm?.getChildFormLinkName(this.childFormData.childForm?.childFormLinkId);

    // TODO: atomize this function
    this.childFormData.childForm?.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        if (!field.cinchyColumn.isDisplayColumn) {
          if (field.linkedColumn?.linkLabel === field.label) {
            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              field.linkedColumn.linkValue ?? Number(this.childFormData.childForm.rowId)
            );

            // TODO: find a better way of updating this value. We should not be directly mutating any fields on a Form, even indirectly
            field.linkedColumn.linkedField.value = this.childFormData.childForm.sections[sectionIndex].fields[fieldIndex].value;
          }
          else if (this.childFormData.presetValues) {
            // bind dropdown values
            if (field.cinchyColumn.dataType === "Link") {
              if (
                  !this.childFormData.presetValues[field.cinchyColumn.name]?.length &&
                  field.label === childFormLinkName
              ) {
                // Prefill child linked column value with parent id if the target table id matches parent form table id
                let parentRowId: number =  this.childFormData.childForm.parentForm.rowId;

                if (field.cinchyColumn.isMultiple) {
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    parentRowId ? [parentRowId.toString()] : []
                  );
                }
                else {
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    parentRowId?.toString() ?? null
                  );
                }
              }
              else if (field.dropdownDataset?.options?.length) {
                if (field.cinchyColumn.isMultiple) {

                  const linkIds = this.childFormData.presetValues[field.cinchyColumn.name] ?? [];

                  // Search by ID, then label
                  let result = field.dropdownDataset.options.filter((option: DropdownOption) => {

                    return (linkIds.indexOf(option.id) > -1 || linkIds.indexOf(option.label) > -1);
                  });

                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    result?.length ? result.map(item => item.id) : []
                  );
                }
                else {
                  // Search by ID, then label
                  let result = field.dropdownDataset.options.find((option: DropdownOption) => {

                    // TODO: We're explicitly using a double equals here because at this stage the ID may be either a number or string depending on where it was
                    //       populated. In the future we'll need to figure out which is correct and make sure we're using it consistently
                    return (
                      (option.id == this.childFormData.presetValues[field.cinchyColumn.name]) ||
                      (option.label === this.childFormData.presetValues[field.cinchyColumn.name])
                    );
                  });

                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    result?.id ?? null
                  );
                }
              }
              else {
                if (field.cinchyColumn.isMultiple) {
                  const allFieldValues = this.childFormData.presetValues[field.cinchyColumn.name]?.split(",").map((value: string) => {

                    return value.trim();
                  });

                  // We don't have enough information to mock the dataset, so the field component can handle generating one
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    allFieldValues
                  );
                }
                else {
                  // Since we have a value but not a dataset, mock the dataset as part of saving the value
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    this.childFormData.presetValues[field.cinchyColumn.name],
                    [
                      {
                        propertyName: "dropdownDataset",
                        propertyValue: new DropdownDataset(
                          [
                            {
                              id: this.childFormData.presetValues[field.cinchyColumn.name],
                              label: this.childFormData.presetValues[`${field.cinchyColumn.name} label`] ?? this.childFormData.presetValues[field.cinchyColumn.name]
                            }
                          ],
                          true
                        )
                      }
                    ]
                  );
                }
              }
            }
            else if (field.cinchyColumn.dataType === "Binary") {
              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                this.childFormData.presetValues[field.cinchyColumn.name],
                [
                  {
                    cinchyColumn: true,
                    propertyName: "fileName",
                    propertyValue: this.childFormData.presetValues[`${field.cinchyColumn.name}_Name`]
                  }
                ]
              );
            }
            else {
              // Note: We're explicitly not using optional chaining here because we need to evaluate the
              //       conditions of "exists" and "not equal" separately to ensure the correct execution
              if (field.linkedColumn && field.linkedColumn.linkLabel !== field.label) {
                this.childFormData.childForm.updateFieldValue(
                  sectionIndex,
                  fieldIndex,
                  null
                );
              // Don't override child form link field with presetValues so we can prefill the value with parent ID
              } else if (field.label !== childFormLinkName) {
                this.childFormData.childForm.updateFieldValue(
                  sectionIndex,
                  fieldIndex,
                  this.childFormData.presetValues[field.cinchyColumn.name]
                );
              }
            }
          }
          else {
            // Clear all values when default values are not provided, since that means we're creating a new record
            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              null,
              [
                {
                  propertyName: "dropdownDataset",
                  propertyValue: null
                }
              ]
            );
          }
        }
        else {
          const displayColumnLabel = `${field.cinchyColumn.linkTargetColumnName} label`;

          if (this.childFormData.presetValues) {
            if (field.dropdownDataset?.options) {
              const selectedValue = field.dropdownDataset.options.find((option: DropdownOption) => {

                return (option.label === this.childFormData.presetValues[displayColumnLabel]);
              });

              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                selectedValue?.id ?? null
              );
            }
            else {
              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                this.childFormData.presetValues[displayColumnLabel] ?? null,
                [
                  {
                    propertyName: "dropdownDataset",
                    propertyValue: new DropdownDataset(
                      [
                        {
                          id: this.childFormData.presetValues[displayColumnLabel],
                          label: this.childFormData.presetValues[displayColumnLabel]
                        }
                      ],
                      true
                    )
                  }
                ]
              );
            }
          }
          else {
            // Clear all values when default values are not provided, since that means we're creating a new record
            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              null
            );
          }
        }
      });
    });
  }


  handleOnChange(event: IFieldChangedEvent): void {

    this.childFormData.childForm.updateFieldValue(
      event.sectionIndex,
      event.fieldIndex,
      event.newValue,
      event.additionalPropertiesToUpdate
    );
  }


  /**
   * Closes the dialog and discards the form contents
   */
  cancel(): void {

    this.dialogRef.close();
  }


  /**
   * Validates the form data, and the passes it back to the parent for processing
   */
  save() {

    let formValidation = this.childFormData.childForm.checkChildFormValidation();

    this.childFormData.childForm.sections.forEach((section: FormSection, sectionIndex: number) => {

      section.fields.forEach((field: FormField, fieldIndex: number) => {

        if (field.cinchyColumn.dataType === "Binary" && field.cinchyColumn.fileName) {
          const keyForBinary = field.cinchyColumn.name + "_Name";

          this.childFormData.childForm.updateFieldAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              cinchyColumn: true,
              propertyName: "fileName",
              propertyValue: this.childFormData.presetValues[keyForBinary]
            }
          );
        }
        else if (field.cinchyColumn.isDisplayColumn && field.dropdownDataset?.isDummy) {
          field.dropdownDataset = null;
        }
      });
    });

    if (formValidation.isValid) {
      this.dialogRef.close((!this.childFormData.presetValues || !this.childFormData.presetValues["Cinchy ID"]) ? -1 : this.childFormData.presetValues["Cinchy ID"]);
    }
    else {
      this._notificationService.displayErrorMessage(`Child form was invalid: ${formValidation.message}`);
    }
  }
}
