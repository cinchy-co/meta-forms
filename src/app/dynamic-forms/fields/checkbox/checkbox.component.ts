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

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faCheckSquare } from "@fortawesome/free-regular-svg-icons";


/**
 * Field representing a boolean Yes/No value
 */
@Component({
  selector: "cinchy-checkbox",
  templateUrl: "./checkbox.component.html",
  styleUrls: ["./checkbox.component.scss"]
})
export class CheckboxComponent implements OnChanges, OnInit {

  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  showError: boolean;
  value: boolean;

  faCheckSquare = faCheckSquare;


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


  valueChanged(): void {

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
    this.value = coerceBooleanProperty(this.field?.value);
  }
}
