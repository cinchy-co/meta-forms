import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { DataFormatType } from "../../enums/data-format-type.enum";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { faAlignLeft } from "@fortawesome/free-solid-svg-icons";


/**
 * Field representing a text value with a maximum size of or greater than 500 characters
 */
@Component({
  selector: "cinchy-textarea",
  templateUrl: "./textarea.component.html",
  styleUrls: ["./textarea.component.scss"]
})
export class TextareaComponent implements AfterViewInit, OnChanges, OnInit {

  @ViewChild("editor") editor;

  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Input() isInChildForm: boolean;
  @Input() sectionIndex: number;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  iframeHeightStyle: number = 300;
  isFormatted: boolean;
  showActualField: boolean;
  showError: boolean;
  showIframe: boolean;
  showIframeSandbox: boolean;
  showIframeSandboxStrict: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  urlSafe: SafeResourceUrl;
  value: string;

  faAlignLeft = faAlignLeft;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  get field(): FormField {

    return this.form?.sections[this.sectionIndex]?.fields[this.fieldIndex];
  }


  constructor(public sanitizer: DomSanitizer) { }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnInit(): void {

    this._setValue();

    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(DataFormatType.ImageUrl);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === "LinkUrl";
    this.showIframe = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrame;
    this.showIframeSandbox = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandbox;
    this.showIframeSandboxStrict = this.field.cinchyColumn.dataFormatType === DataFormatType.IFrameSandboxStrict;

    this.isFormatted = coerceBooleanProperty(
      this.field.cinchyColumn.dataFormatType &&
      !this.showImage &&
      !this.showLinkUrl &&
      !this.showIframe &&
      !this.showIframeSandbox &&
      !this.showIframeSandboxStrict
    );

    if ((this.showIframe || this.showIframeSandbox || this.showIframeSandboxStrict) && this.isValidHttpUrl(this.value) && !this.isInChildForm){
      this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.field.value);
      this.iframeHeightStyle = this.field.cinchyColumn.totalTextAreaRows ? 100 * this.field.cinchyColumn.totalTextAreaRows : 300;
    }
    else {
      this.showIframe = false;
      this.showIframeSandbox = false;
      this.showIframeSandboxStrict = false;
    }

    this.showActualField = !this.showImage && !this.showLinkUrl && !this.showIframe && !this.showIframeSandbox && !this.showIframeSandboxStrict;
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

      this.editor.value = this.value;

      this.editor.setReadOnly(!this.canEdit);

      this.editor.getEditor().commands.addCommand({
        name: "showOtherCompletions",
        bindKey: "Ctrl-.",
        exec: function (editor) {

        }
      })
    }
  }


  isValidHttpUrl(str: string) {

    let url;

    try {
      url = new URL(str);
    } catch (_) {
      return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.isFormatted ? this.editor.value : this.value,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }

  /**
  * If the field is displaying an imaged, returns the class name associated with the configured format
  */
  get imageSize(): string {

    if (this.showImage) {
      switch (this.field.cinchyColumn.dataFormatType) {
        case DataFormatType.ImageUrlSmall:

          return "cinchy-images-small";
        case DataFormatType.ImageUrlLarge:

          return "cinchy-images-large";
        case DataFormatType.ImageUrlSmall:
          // falls through
        case DataFormatType.ImageUrl:

          return "cinchy-images";
        default:
          return "";
      }
    }

    return "";
  }

  private _setValue(): void {

    if (this.field?.cinchyColumn?.dataFormatType === DataFormatType.JSON) {
      try {
        const parsedValue = JSON.parse(this.field.value);

        this.value = parsedValue ? JSON.stringify(parsedValue, null, 2) : null;
      }
      catch (error) {
        // If the JSON is invalid, just pass it through as-is
        this.value = this.field.value ?? null;
      }
    }
    else {
      this.value = this.field?.value ?? null;
    }
  }
}
