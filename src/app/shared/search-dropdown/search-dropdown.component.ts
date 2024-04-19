import {
  Subscription
} from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  startWith
} from "rxjs/operators";

import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { FormControl } from "@angular/forms";

import { faSearch } from "@fortawesome/free-solid-svg-icons";

import { ILookupRecord } from "src/app/models/lookup-record.model";

import { CinchyQueryService } from "../../services/cinchy-query.service";


@Component({
  selector: "app-search-dropdown",
  templateUrl: "./search-dropdown.component.html",
  styleUrls: ["./search-dropdown.component.scss"]
})
export class SearchDropdownComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() items: Array<ILookupRecord>;

  @Input() set selectedOption(value: ILookupRecord) {

    this.selectedRecordId = value?.id;
    this.selectedRecord = value;
  };

  @Output() dropdownClicked: EventEmitter<any> = new EventEmitter();

  /** Fires whenever a filter value resolves */
  @Output() onFilter: EventEmitter<string> = new EventEmitter<string>();

  displayItems: Array<ILookupRecord>;

  /**
   * The ID of the active record
   */
  selectedRecordId: number;

  /**
   * The record associated with the selected value
   */
  selectedRecord: ILookupRecord;

  /**
   * Form control for the filter string
   */
  filterCtrl: FormControl = new FormControl();


  faSearch = faSearch;


  private _subscription = new Subscription();


  /**
   * Determines whether or not there are more records in the set than are being displayed by the control
   */
  get hasAdditionalRecords(): boolean {

    return (this.items?.length > CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT);
  }


  /**
   * Returns true is the item list only contains the placeholder item for an empty result
   */
  get noRecordsAfterFilter(): boolean {

    return (this.items?.length === 1 && this.items[0].id === -1);
  }


  ngAfterViewInit() {

    // listen for search field value changes
    this._subscription.add(
      this.filterCtrl.valueChanges.pipe(
        startWith(null),
        distinctUntilChanged(),
        debounceTime(500),
      )
      .subscribe(() => {

        this.onFilter.emit(this.filterCtrl.value);
      })
    );
  }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes.items) {
      this.setDisplayItems();
    }
  }


  ngOnDestroy(): void {

    this._subscription.unsubscribe();
  }


  /**
   * Runs when the user selects an item from the dropdown
   */
  onSelect(event: number) {

    this.selectedRecord = this.displayItems.find((value: ILookupRecord) => {

      return value.id === this.selectedRecordId;
    });

    this.dropdownClicked.emit(this.selectedRecord);

    this.setDisplayItems();
  }


  /**
   * Sets up the set of options to be displayed
   */
  setDisplayItems() {

    if (this.noRecordsAfterFilter) {
      this.displayItems = this.items.slice();
    }
    else {
      let displayItems = this.selectedRecord ? [Object.assign({}, this.selectedRecord)] : [];

      if (this.items) {
        const resolvedItems = this.items.slice(0, CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT);

        resolvedItems.forEach((value: ILookupRecord) => {

          if (value.id !== this.selectedRecord?.id) {
            displayItems.push(value);
          }
        });
      }

      this.displayItems = displayItems.slice();
    }
  }
}
