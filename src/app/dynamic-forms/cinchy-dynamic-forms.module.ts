import { MultiChoiceDirective } from './fields/cinchy-form-multichoice.directive';
import { ChoiceDirective } from './fields/cinchy-form-choice.directive';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { CinchyModule } from '@cinchy-co/angular-sdk';
import { NgxSelectModule, INgxSelectOptions } from 'ngx-select-ex';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { ToastrModule } from 'ngx-toastr';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DigitOnlyModule } from '@uiowa/digit-only';

//#region Custom
import { LinkDirective } from './fields/cinchy-form-link.directive';
import { TextBoxDirective } from './fields/cinchy-form-textbox.directive';
import { TextAreaDirective } from './fields/cinchy-form-textarea.directive';
import { CheckBoxDirective } from './fields/cinchy-form-checkbox.directive';
import { ChildFormTableDirective } from './fields/cinchy-child-form-table.directive';
import { CalculatedDirective } from './fields/cinchy-form-calculated.directive';
import { NumberDirective } from './fields/cinchy-form-number.directive';
import { ChildFormDirective } from './fields/cinchy-child-form.directive';
import { CinchyDynamicFormsComponent } from './cinchy-dynamic-forms.component';
import { RichTextDirective } from './fields/cinchy-form-richtext.directive';
//#endregion

//#region Pipes for the forms
import { KeysPipe } from './pipes/cinchy-column-key.pipe';
import { DateTimeDirective } from './fields/cinchy-form-datetime.directive';
import { AttachFileDirective } from './fields/cinchy-form-attachfile.directive';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FieldsWrapperComponent } from './fields-wrapper/fields-wrapper.component';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { SharedModule } from '../shared/shared.module';
import { LinkMultichoice } from './fields/cinchy-form-link-multichoice';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import 'brace';
import 'brace/index';
import 'brace/ext/language_tools';
import 'brace/snippets/text';
import 'brace/snippets/sql';
import 'brace/snippets/html';
import 'brace/snippets/sqlserver';
import 'brace/snippets/javascript';
import 'brace/snippets/xml';
import 'brace/snippets/json';
import { AceEditorModule } from 'ng2-ace-editor';
import 'ace-builds/webpack-resolver';
import { DatePipe } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxEditorModule } from 'ngx-editor';

window['ace']['require'] = window['ace']['acequire'];

//#endregion

//#region Select Dropdownlist options
const CustomSelectOptions: INgxSelectOptions = { // Check the interface for more options
  optionValueField : 'id',
  optionTextField  : 'label',
  keepSelectedItems: true
};
//#endregion
//#endregion
@NgModule({
  declarations   : [
    LinkDirective,
    LinkMultichoice,
    TextBoxDirective,
    DateTimeDirective,
    AttachFileDirective,
    TextAreaDirective,
    CheckBoxDirective,
    ChildFormTableDirective,
    CalculatedDirective,
    NumberDirective,
    ChildFormDirective,
    RichTextDirective,
    KeysPipe,
    CinchyDynamicFormsComponent,
    ChoiceDirective,
    MultiChoiceDirective,
    FieldsWrapperComponent,
    MessageDialogComponent
  ],
  imports        : [
    BrowserModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    CinchyModule.forRoot(),
    MatCardModule,
    FilterPipeModule,
    NgxSelectModule.forRoot(CustomSelectOptions),
    NgxSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatExpansionModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut          : 5000,
      closeButton      : true,
      preventDuplicates: true
    }),
    FontAwesomeModule,
    AngularMultiSelectModule,
    DigitOnlyModule,
    ScrollingModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SharedModule,
    NgxMatSelectSearchModule,
    AceEditorModule,
    NgbModule,
    NgxEditorModule
  ],
  exports        : [CinchyDynamicFormsComponent],
  entryComponents: [ChildFormDirective, MessageDialogComponent],
  providers      : [CinchyModule, DatePipe],
  bootstrap      : []
})
export class CinchyDynamicFormsModule {
}
