import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit } from "@angular/core";

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";

import { ImageType } from "../../enums/imageurl-type";
import { ResponseType } from "../../enums/response-type.enum";

import { IEventCallback, EventCallback } from "../../models/cinchy-event-callback.model";


//#region Cinchy Dynamic TextArea
/**
 * This section is used to create dynamic textarea fields for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-textarea",
  templateUrl: "./textarea.component.html",
  styleUrls: ["./textarea.component.scss"]
})
export class TextareaComponent implements AfterViewInit, OnInit {
  @Input() field: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  @ViewChild("editor") editor;
  isFormatted;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  faAlignLeft = faAlignLeft;
  
  constructor() {}

  ngOnInit() {
    if (this.field.cinchyColumn.dataFormatType === "JSON") {
      this.field.value = JSON.stringify(JSON.parse(this.field.value), null, 2)
    }
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType && !this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default) && this.field.cinchyColumn.dataFormatType !== "LinkUrl";
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showActualField = !this.showImage && !this.showLinkUrl;
  }

  ngAfterViewInit() {

    if (this.isFormatted) {
      this.editor.getEditor().setOptions({
        showLineNumbers: true,
        tabSize: 4,
        theme: "ace/theme/sqlserver",
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightGutterLine: true
      });
      switch (this.field.cinchyColumn.dataFormatType) {
        case "XML":
          this.editor.mode = "xml";
          break;
        case "Javascript":
          this.editor.mode = "javascript";
          break;
        case "CQL":
          this.editor.mode = "sqlserver";
          break;
        default:
          this.editor.mode = this.field.cinchyColumn.dataFormatType.toLowerCase();
      }
      this.editor.value = this.field.value;
      if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
        this.editor.setReadOnly(true);
      }
      this.editor.getEditor().commands.addCommand({
        name: "showOtherCompletions",
        bindKey: "Ctrl-.",
        exec: function (editor) {

        }
      })
    }
  }


  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = this.field.value;
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value,
      "event": event,
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }
  //#endregion
}