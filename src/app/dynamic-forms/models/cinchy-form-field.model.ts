import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";

import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { UntypedFormControl } from "@angular/forms";

import { CinchyColumn } from "./cinchy-column.model";
import { Form } from "./cinchy-form.model";

import { ILinkedColumnDetails } from "../interface/linked-column-details";

import { DropdownDataset } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownOption } from "../service/cinchy-dropdown-dataset/cinchy-dropdown-options";

import { isNullOrUndefined } from "util";


export class FormField {

  // TODO: are these fields necessary?
  formControl: UntypedFormControl;
  filteredValues: Observable<DropdownOption[]>;

  hide: boolean = false;

  linkedColumn: ILinkedColumnDetails;

  // This is initialized to null to prevent false positives for change detection
  value: any = null;


  /**
   * Determines whether or not this field has what the app considers to be a value. Empty arrays
   * in multi-select controls are considered to be non-values.
   */
  get hasValue(): boolean {

    if (Array.isArray(this.value)) {
      return !!(this.value && this.value.length);
    }

    return (!!this.value || this.value === 0);
  }


  constructor(
      public id: number,
      public label: string,
      public caption: string,
      public childForm: Form,
      public cinchyColumn: CinchyColumn,
      public form: Form,
      public dropdownDataset?: DropdownDataset,
      linkedColumnDetails?: ILinkedColumnDetails
  ) {

    if (cinchyColumn.dataType === "Link" && dropdownDataset) {
      this.formControl = new UntypedFormControl(null);
      this.filteredValues = this.formControl.valueChanges.pipe(startWith(""), map(value => this._filter(value)));
    }

    this.linkedColumn = linkedColumnDetails;
  }


  clone(): FormField {

    const clonedField = new FormField(
      this.id,
      this.label,
      this.caption,
      this.childForm,
      this.cinchyColumn,
      this.form,
      this.dropdownDataset,
      this.linkedColumn
    );

    clonedField.hide = this.hide;
    clonedField.value = this.value;

    clonedField.formControl = this.formControl;
    clonedField.filteredValues = this.filteredValues;

    return clonedField;
  }


  isLinkedColumn(key: string): boolean {

    return coerceBooleanProperty(this.linkedColumn?.linkLabel === key);
  }


  setInitialValue(value: any) {

    if (this.cinchyColumn.dataType === "Date and Time" && !isNullOrUndefined(value)) {
      this.value = new Date(value);
    }
    else if (this.cinchyColumn.dataType === "Choice" && !isNullOrUndefined(value) && this.cinchyColumn.isMultiple) {
      let multiChoiceData = new Array<any>();

      for (let selected of value) {
        multiChoiceData.push(selected.itemName);
      }

      this.value = multiChoiceData;
    }
    else if (value && this.cinchyColumn.dataType === "Link" && this.cinchyColumn.isMultiple && !Array.isArray(value)) {
      this.value = value?.split(",").map((item) => {

        return item.trim ? item.trim() : item;
      });
    }
    else {
      this.value = value;
    }

    this.formControl?.setValue(this.value);
  }


  private _filter (filter: string) {

    const lowercaseFilter = filter?.toLowerCase() || "";

    return this.dropdownDataset?.options.filter((option: DropdownOption) => {

      if (!lowercaseFilter || option.label?.toLowerCase().includes(lowercaseFilter)) {
        return option;
      }
    });
  }
}
