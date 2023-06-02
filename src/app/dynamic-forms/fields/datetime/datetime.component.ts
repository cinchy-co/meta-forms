import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faCalendar } from "@fortawesome/free-regular-svg-icons";

import * as moment from "moment";


/**
 * This section is used to create dynamic DateTime field for the cinchy.
 */
@Component({
  selector: "cinchy-datetime",
  templateUrl: "./datetime.component.html",
  styleUrls: ["./datetime.component.scss"]
})
export class DatetimeComponent implements OnChanges, OnInit {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
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

  showError: boolean;
  value: string;            // Stores the value for the actual form field with the correctly formatted date
  datePickerValue: string;  // Stores the raw unformatted value from the date picker
  faCalendar = faCalendar;

  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnInit(): void {

    this._setValue();
  }


  valueChanged(): void {
    this.value = this.datePickerValue ? moment(this.datePickerValue).format(this.field.cinchyColumn.displayFormat || "MM/DD/yyyy") : null;

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _setValue(): void {
    console.log('_setValue', this.field?.value);
    console.log('_setValue', this.field?.value ? moment(this.field.value).format(this.field.cinchyColumn.displayFormat || "MM/DD/yyyy") : "");
    this.value = this.field?.value ? moment(this.field.value).format(this.field.cinchyColumn.displayFormat || "MM/DD/yyyy") : "";
  }
}
