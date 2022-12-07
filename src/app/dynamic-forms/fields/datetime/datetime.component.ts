import {Component, Input, Output, EventEmitter, OnInit} from "@angular/core";
import {ResponseType} from "../../enums/response-type.enum";
import {IEventCallback, EventCallback} from "../../models/cinchy-event-callback.model";

import {DatePipe} from "@angular/common";

import { faCalendar } from "@fortawesome/free-regular-svg-icons";

import * as moment from "moment";


//#region Cinchy Dynamic DateTime Field
/**
 * This section is used to create dynamic DateTime field for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-datetime",
  templateUrl: "./datetime.component.html",
  styleUrls: ["./datetime.component.scss"]
})
export class DatetimeComponent implements OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  preSelectedDate :any;
  showError;
  faCalendar = faCalendar;

  constructor(){}

  ngOnInit() {
    this.preSelectedDate = this.field.value ? this.field.value : "";
   if(this.preSelectedDate){
     this.preSelectedDate = moment(this.preSelectedDate).format(this.field.cinchyColumn.displayFormat);}
  }

  checkForDate(){
    if(!this.preSelectedDate){
      this.field.cinchyColumn.hasChanged = true;
    }
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = event[prop];
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value,
      "event": event,
      "HasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    };
    let selectedDate = value ? value : this.preSelectedDate;
    this.field.value = moment(selectedDate).format("MM/DD/yyyy");

    // re-assign format of date
    this.preSelectedDate = moment(selectedDate).format(this.field.cinchyColumn.displayFormat);
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion
}
