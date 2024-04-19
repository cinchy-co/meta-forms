import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { CurrencyPipe } from "@angular/common";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { faHashtag } from "@fortawesome/free-solid-svg-icons";

import { NumeralPipe } from "ngx-numeral";
import { FormField } from "../../models/cinchy-form-field.model";
import { Form } from "../../models/cinchy-form.model";


/**
 * Field representing a number value. The value will always be stored as a plain number, but
 * a mask can be optionally applied to show the number in a different format while the field
 * is unfocused.
 */
@Component({
  selector: "cinchy-number",
  templateUrl: "./number.component.html",
  styleUrls: ["./number.component.scss"],
  providers: [CurrencyPipe]
})
export class NumberComponent implements OnChanges, OnInit {

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

  /**
   * The display value when the user is not actively entering the number
   */
  formattedAmount: string;

  /**
   * The numeric value of the field
   */
  numeralValue: NumeralPipe;

  showError: boolean;


  faHashtag = faHashtag;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get field(): FormField {

    return this.form?.sections[this.sectionIndex]?.fields[this.fieldIndex];
  }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnInit(): void {

    this._setValue();
  }


  transformAmount() {
    if (this.formattedAmount) {
      this.numeralValue = new NumeralPipe(this.formattedAmount);
      this.formattedAmount = this.field.cinchyColumn.numberFormatter ? this.numeralValue.format(this.field.cinchyColumn.numberFormatter) : this.numeralValue.value().toString();
    }
    else {
      this.numeralValue = null;
      this.formattedAmount = "";
    }

    this.valueChanged();
  }


  /**
   * Transforms the numeral value back into a string for display
   */
  reverseTransform() {

    this.formattedAmount = this.numeralValue?.value()?.toString() ?? "";
  }


  valueChanged(): void {
    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.numeralValue?.value() ?? null,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _setValue(): void {
    if (this.field?.cinchyColumn?.numberFormatter && this.field?.value) {
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.numeralValue.format(this.field.cinchyColumn.numberFormatter);
    } else {
      this.numeralValue = null;
      this.formattedAmount = this.field?.value ?? null;
    }
  }
}
