import { NgModule } from "@angular/core";
import { OverlayModule } from "@angular/cdk/overlay";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { RouterModule } from "@angular/router";

import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { CustomMaterialModule } from "../custom-material.module";

import { SearchDropdownComponent } from "./search-dropdown/search-dropdown.component";


@NgModule({
  declarations: [
    SearchDropdownComponent
  ],
  imports: [
    BrowserModule, // Used for async pipes
    CustomMaterialModule,
    FontAwesomeModule,
    FormsModule,
    OverlayModule,
    ReactiveFormsModule,
    RouterModule,
    ScrollingModule,
    NgxMatSelectSearchModule
  ],
  exports: [
    SearchDropdownComponent
  ],
  providers: []
})
export class SharedModule {}
