import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { UntypedFormControl } from "@angular/forms";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faListUl } from "@fortawesome/free-solid-svg-icons";
import {DropdownOption} from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";


/**
 * As the ChoiceComponent, but allows the user to select multiple options. The value will be
 * stored to the table as a comma-delimited list.
 */
@Component({
    selector: "cinchy-multi-choice",
    templateUrl: "./multichoice.component.html",
    styleUrls: ["./multichoice.component.scss"]
})
export class MultichoiceComponent implements OnChanges, OnDestroy, OnInit {

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
  value: Array<string>;
  options: Array<string>;

  displayOptions = new BehaviorSubject<Array<string>>(new Array<string>());

  filterCtrl: UntypedFormControl = new UntypedFormControl();

  onDestroy = new Subject<void>();

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


  ngOnDestroy(): void {

    this.onDestroy.next();
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
      });
    }

    this.options = allOptions.slice();
    this.displayOptions.next(this.options);

    this.filterCtrl.valueChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => {

        this.filter();
      });
  }


  filter(): void {

    if (this.options) {
      // get the search keyword
      let search = this.filterCtrl.value;

      if (!search) {
        this.displayOptions.next(this.options);
      }
      else {
        search = search.toLowerCase();

        // filter the list
        this.displayOptions.next(
          this.options.filter(
            (item: string) => {

              return (item.toLowerCase().indexOf(search) > -1)
            }
          )
        );
      }
    }
  }


  resetFilter(): void {

    this.filterCtrl.setValue("");
  }

  toggleSelectAll(selectAll: boolean): void {

    this.value = selectAll ?
      this.options.slice():
      [];

    this.valueChanged();
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

    if (this.field?.value) {
      this.value = Array.isArray(this.field.value) ? this.field.value : [this.field.value];
    }
    else {
      this.value = null;
    }
  }
}
