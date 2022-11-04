import {Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnInit,OnDestroy} from '@angular/core';
import {IEventCallback, EventCallback} from '../models/cinchy-event-callback.model';
import {ResponseType} from '../enums/response-type.enum';
import {faAlignLeft} from '@fortawesome/free-solid-svg-icons';
import {AngularEditorConfig} from '@kolkov/angular-editor';


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
      <angular-editor [placeholder]="'Enter text here...'" [(ngModel)]="field.value" [config]="editorConfig" (blur)="callbackEvent(targetTableName, field.cinchyColumn.name, $event, 'value')"></angular-editor>
      <mat-error
        *ngIf="showError && (field.cinchyColumn.isMandatory == true &&(field.value =='' || field.value == null))">
        *{{field.label}} is Required.
      </mat-error>
    </div>
  `,
})
export class RichTextDirective implements AfterViewInit, OnInit, OnDestroy {
  @Input() field: any;
  @Input() targetTableName: string;
  @Input() isDisabled: boolean;
  @Input('fieldsWithErrors') set fieldsWithErrors(errorFields: any) {
    this.showError = errorFields ? !!errorFields.find(item => item == this.field.label) : false;
  };
  
  @Output() eventHandler = new EventEmitter<any>();

  showError: boolean;
  faAlignLeft = faAlignLeft;

  editorConfig: AngularEditorConfig;
  readonly: boolean;
  
  constructor() {
  }

  ngOnInit() {
    this.initEditorConfig();
  }

  ngAfterViewInit() {
    this.initEditorConfig();
  }

  initEditorConfig(): void {
    this.readonly = this.field.cinchyColumn.canEdit === false || this.field.cinchyColumn.isViewOnly || this.isDisabled;
    this.editorConfig = {
      editable: !this.readonly,
      spellcheck: true,
      height: 'auto',
      minHeight: '450px',
      maxHeight: 'auto',
      width: 'auto',
      minWidth: '0',
      translate: 'yes',
      enableToolbar: !this.readonly,
      showToolbar: !this.readonly,
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
      sanitize: false,
      toolbarPosition: 'top',
      toolbarHiddenButtons: [
        ['bold', 'italic'],
        ['fontSize']
      ]
    };
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
