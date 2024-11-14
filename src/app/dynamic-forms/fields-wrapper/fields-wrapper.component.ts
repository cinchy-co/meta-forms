import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";

import { TextFormatType } from "../enums/text-format-type.enum";

import { IFieldChangedEvent } from "../interface/field-changed-event";

import { Form } from "../models/cinchy-form.model";
import { FormField } from "../models/cinchy-form-field.model";
import { FormSection } from "../models/cinchy-form-section.model";

import { AppStateService } from "../../services/app-state.service";

import { isNullOrUndefined } from "util";
import {coerceBooleanProperty} from "@angular/cdk/coercion";
import {DataFormatType} from "../enums/data-format-type.enum";


/**
 * For each field in this form, renders a component appropriate to its configured type and
 * characteristics.
 */
@Component({
  selector: "app-fields-wrapper",
  templateUrl: "./fields-wrapper.component.html",
  styleUrls: ["./fields-wrapper.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class FieldsWrapperComponent {

  @Input() form: Form;
  @Input() isChild: boolean;
  @Input() fieldsWithErrors;

  @Input()
  get formHasDataLoaded(): boolean {

    return this._formHasDataLoaded;
  }
  set formHasDataLoaded(value: boolean) {

    if (value) {
      this._setDisplaySections();
    }

    this._formHasDataLoaded = value;
  }
  private _formHasDataLoaded: boolean;


  @Output() onChange = new EventEmitter<IFieldChangedEvent>();
  @Output() childRowDeleted = new EventEmitter<{
    childForm: Form,
    rowId: number
  }>();
  @Output() childFormOpened = new EventEmitter<any>();


  displaySections = new Array<{ section: FormSection, sectionIndex: number }>();


  constructor(
    private _appStateService: AppStateService,
  ) {}


  handleOnChange(event: IFieldChangedEvent): void {

    this.onChange.emit(event);
  }


  onPanelExpanded(section: FormSection): void {

    this._appStateService.sectionExpanded$.next(section.label);
  }


  richTextUseJson(field: FormField): boolean {

    return (field.cinchyColumn.textFormat !== TextFormatType.HTML);
  }


  usePlaintext(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && !this.useRichText(field) && field.cinchyColumn.textColumnMaxLength <= 500)
  }


  useRichText(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && !!(field.cinchyColumn.textFormat));
  }


  useTextarea(field: FormField): boolean {

    return (field.cinchyColumn.dataType === "Text" && !this.useRichText(field) && field.cinchyColumn.textColumnMaxLength > 500);
  }


  /**
   * Builds the set of sections to display in the view. If a field contains a child form which has been marked for flattening, its
   * sections are injected at the root level immediately after the section in which that field appears
   */
  private _setDisplaySections(): void {

    const displaySections = new Array<{ section: FormSection, sectionIndex: number }>();

    let parentSectionIdx = 0;
    let flattenedChildFormSectionIdxMap = {};

    this.form?.sections?.forEach((section: FormSection, sectionIndex: number) => {

      displaySections.push({
        section: section.clone(),
        sectionIndex: parentSectionIdx
      });

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        if (field.childForm?.flatten && field.childForm.sections?.length) {
          if (flattenedChildFormSectionIdxMap[field.childForm.id] == null) {
            flattenedChildFormSectionIdxMap[field.childForm.id] = 0;
          }

          this.form.sections[sectionIndex].fields[fieldIndex].childForm.sections.forEach((childSection: FormSection) => {

            const childSectionClone = childSection.clone();

            childSectionClone.isInFlattenedChildForm = true;

            displaySections.push({
              section: childSectionClone,
              sectionIndex: flattenedChildFormSectionIdxMap[field.childForm.id]
            });

            flattenedChildFormSectionIdxMap[field.childForm.id]++;
          });
        }
      });

      parentSectionIdx++;
    });

    this.displaySections = displaySections;
  }
}
