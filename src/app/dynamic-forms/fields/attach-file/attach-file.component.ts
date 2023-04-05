import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";

import { ResponseType } from "../../enums/response-type.enum";
import { IEventCallback, EventCallback } from "../../models/cinchy-event-callback.model";

import { faFile } from "@fortawesome/free-regular-svg-icons";


//#region Cinchy Dynamic DateTime Field
/**
 * This section is used to create dynamic DateTime field for the cinchy.
 */
//#endregion
@Component({
  selector: "cinchy-attach-file",
  templateUrl: "./attach-file.component.html",
  styleUrls: ["./attach-file.component.scss"]
})
export class AttachFileComponent implements OnInit {
  @Input() field: any;
  @Input() rowId: any;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Output() eventHandler = new EventEmitter<any>();
  @Input() Form: any;
  showError: boolean;
  // Variable to store File
  fileToUpload: File = null;
  fileName;
  faFile = faFile;
  constructor() {
  }

  async ngOnInit() {
    this.fileName = this.field.cinchyColumn.fileName;
  }

  // Function called after selecting a file
  handleFileInput(files: FileList) {
    this.fileToUpload = files.item(0);
  }

  async onFileSelected(field, event) {
    this.field.cinchyColumn.hasChanged = true;
    let file = event.target.files[0];
    this.Form.forEach(element => {
      if (element.cinchyColumn.name === "File Name") {
        element.value = file.name;
      }
    });
    field.cinchyColumn.fileName = file.name;
    field.value = await this.readFileAsyncEncode(file);
    this.field.value = field.value;
    this.callbackEvent(this.targetTableName, field.cinchyColumn.name, field.value)
  }

  readFileAsyncEncode(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onloadend = () => {
        resolve(btoa(<string>reader.result));
      }
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    })
  }

  getConvertedRealFileName(codifiedValue) {
    return btoa(codifiedValue)
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, value: any) {
    // constant values
    const Data = {
      "TableName": targetTableName,
      "ColumnName": columnName,
      "Value": value,
      "event": event,
      "hasChanged": this.field.cinchyColumn.hasChanged,
      "Form": this.field.form,
      "Field": this.field
    }
    this.field.cinchyColumn.hasChanged = true;
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion

  downloadDocument(event, doc) {
    const arrayBuffer = this.base64ToArrayBuffer(doc);
    var blob = new Blob([arrayBuffer], { type: "application/binary" });
    // Download file
    this.saveFile(blob, this.fileName);
  }

  // Convert the saved base64 text to an Array Buffer
  base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    return bytes.map((byte, i) => binaryString.charCodeAt(i));
  }

  // Downloads the file
  saveFile(blob, filename) {
    if (window.navigator["msSaveOrOpenBlob"]) {
      window.navigator["msSaveOrOpenBlob"](blob, filename);
    } else {
      const a = document.createElement("a");
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0)
    }
  }
}
