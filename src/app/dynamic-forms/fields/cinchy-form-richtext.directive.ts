import {Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit,OnDestroy} from '@angular/core';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';
import {ResponseType} from '../enums/response-type.enum';
import { ImageType } from '../enums/imageurl-type';
import { faAlignLeft } from '@fortawesome/free-solid-svg-icons';
// import { Editor } from 'ngx-editor';
import { AngularEditorConfig } from '@kolkov/angular-editor';

//#region Cinchy Dynamic TextArea
/**
 * This section is used to create dynamic textarea fields for the cinchy.
 */
//#endregion
@Component({
  selector: 'cinchy-richtext',
  template: `
    <div *ngIf="field.cinchyColumn.canView" class="full-width-element divMarginBottom">
      <div class="link-labels">
      <div>
          <fa-icon [icon]="faAlignLeft"></fa-icon>
       </div>
       &nbsp;
        <label class="cinchy-label" [title]="field.caption ? field.caption : ''">
          {{field.label}}
          {{field.cinchyColumn.isMandatory == true && (field.value == '' || field.value == null) ? '*' : ''}}
        </label>
        <mat-icon *ngIf="field.caption" class="info-icon"
                  ngbTooltip = "{{field.caption}}"
                  placement="auto"
                  container="body"
                  matTooltipClass="tool-tip-body"
                  matTooltipPosition="above">
          info
        </mat-icon>
      </div>
      <ng-container *ngIf="!field.cinchyColumn.isViewOnly && !isDisabled && field.cinchyColumn.canEdit">
        <angular-editor [placeholder]="'Enter text here...'" [(ngModel)]="field.value" [config]="editorConfig" (blur)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"></angular-editor>
        <mat-error
          *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
          *{{field.label}} is Required.
        </mat-error>
      </ng-container>
    </div>
  `,
})
export class RichTextDirective implements AfterViewInit, OnInit, OnDestroy {
  @Input() field: any;

  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };

  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Output() eventHandler = new EventEmitter<any>();
  //@ViewChild('editor') editor;
  isFormatted;
  showError: boolean;
  showImage: boolean;
  showLinkUrl: boolean;
  showActualField: boolean;
  faAlignLeft = faAlignLeft;

  //editor: Editor;
  editorConfig: AngularEditorConfig;
  readonly: boolean;
  
  constructor() {
  }

  ngOnInit() {
    if (this.field.cinchyColumn.dataFormatType === 'JSON') {
      this.field.value = JSON.stringify(JSON.parse(this.field.value), null, 2)
    }
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType && !this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default) && this.field.cinchyColumn.dataFormatType !== 'LinkUrl';
    this.showImage = this.field.cinchyColumn.dataFormatType?.startsWith(ImageType.default);
    this.showLinkUrl = this.field.cinchyColumn.dataFormatType === 'LinkUrl';
    this.showActualField = !this.showImage && !this.showLinkUrl;

    
    this.readonly = this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled;
    this.editorConfig = {
      editable: !this.readonly,
      spellcheck: true,
      height: 'auto',
      minHeight: '500px',
      maxHeight: 'auto',
      width: 'auto',
      minWidth: '0',
      translate: 'yes',
      enableToolbar: true,
      showToolbar: true,
      placeholder: 'Enter text here...',
      defaultParagraphSeparator: '',
      defaultFontName: '',
      defaultFontSize: '',
      fonts: [
        {class: 'arial', name: 'Arial'},
        {class: 'times-new-roman', name: 'Times New Roman'},
        {class: 'calibri', name: 'Calibri'},
        {class: 'comic-sans-ms', name: 'Comic Sans MS'}
      ],
      customClasses: [],
      sanitize: true,
      toolbarPosition: 'top',
      toolbarHiddenButtons: [
        ['bold', 'italic'],
        ['fontSize']
      ]
    };
  }

  ngAfterViewInit() {
    this.readonly = this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled;
    this.editorConfig = {
      editable: !this.readonly,
      spellcheck: true,
      height: 'auto',
      minHeight: '500px',
      maxHeight: 'auto',
      width: 'auto',
      minWidth: '0',
      translate: 'yes',
      enableToolbar: true,
      showToolbar: true,
      placeholder: 'Enter text here...',
      defaultParagraphSeparator: '',
      defaultFontName: '',
      defaultFontSize: '',
      fonts: [
        {class: 'arial', name: 'Arial'},
        {class: 'times-new-roman', name: 'Times New Roman'},
        {class: 'calibri', name: 'Calibri'},
        {class: 'comic-sans-ms', name: 'Comic Sans MS'}
      ],
      customClasses: [],
      sanitize: true,
      toolbarPosition: 'top',
      toolbarHiddenButtons: [
        ['bold', 'italic'],
        ['fontSize']
      ]
    };
    // if (this.isFormatted) {
    //   this.editor.getEditor().setOptions({
    //     showLineNumbers: true,
    //     tabSize: 4,
    //     theme: 'ace/theme/sqlserver',
    //     enableBasicAutocompletion: true,
    //     enableSnippets: true,
    //     enableLiveAutocompletion: true,
    //     highlightGutterLine: true
    //   });
    //   switch (this.field.cinchyColumn.dataFormatType) {
    //     case 'XML':
    //       this.editor.mode = 'xml';
    //       break;
    //     case 'Javascript':
    //       this.editor.mode = 'javascript';
    //       break;
    //     case 'CQL':
    //       this.editor.mode = 'sqlserver';
    //       break;
    //     default:
    //       this.editor.mode = this.field.cinchyColumn.dataFormatType.toLowerCase();
    //   }
    //   this.editor.value = this.field.value;
      //if (this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled) {
        //this.editor.setReadOnly(true);
        
      //}
      // this.editor.getEditor().commands.addCommand({
      //   name: "showOtherCompletions",
      //   bindKey: "Ctrl-.",
      //   exec: function (editor) {

      //   }
      // })
    //}
  }

  ngOnDestroy(): void {
  }

  //#region pass callback event to the project On blur
  callbackEvent(targetTableName: string, columnName: string, event: any, prop: string) {
    // constant values
    const value = this.field.value;
    this.field.cinchyColumn.hasChanged = true;
    const Data = {
      'TableName': targetTableName,
      'ColumnName': columnName,
      'Value': value,
      'event': event,
      'HasChanged': this.field.cinchyColumn.hasChanged,
      'Form': this.field.form,
      'Field': this.field
    }
    // pass calback event
    const callback: IEventCallback = new EventCallback(ResponseType.onBlur, Data);
    this.eventHandler.emit(callback);
  }

  //#endregion
}
