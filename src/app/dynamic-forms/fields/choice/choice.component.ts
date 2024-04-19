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

import { faListUl } from "@fortawesome/free-solid-svg-icons";


/**
 * A field representing a choice field with a static set of options
 */
@Component({
  selector: "cinchy-choice",
  templateUrl: "./choice.component.html",
  styleUrls: ["./choice.component.scss"]
})
export class ChoiceComponent implements OnChanges, OnInit {

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
  value: string;
  options: Array<string>;

  faListUl = faListUl;


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

    const choices = this.field.cinchyColumn.choiceOptions;
    const splitFromInvertedCommas = choices?.split(`"`) ?? [];

    let allOptions = [];
    let optionsInSubString = [];

    if (splitFromInvertedCommas.length === 1) {
      allOptions = choices?.split(",") ?? [];
    }
    else {
      splitFromInvertedCommas.forEach(option => {

        if (option && (option[0] === "," || option[option.length - 1] === ",")) {
          optionsInSubString = option.split(",");
          allOptions = [...allOptions, ...optionsInSubString];
        }
        else if (option) {
          allOptions.push(option);
        }
      })
    }
    this.options = allOptions.slice();
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.value ?? [],
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _setValue(): void {

    this.value = this.field?.value ?? null;
  }
}
