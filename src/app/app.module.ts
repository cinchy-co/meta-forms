import { APP_INITIALIZER, NgModule } from "@angular/core";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CinchyConfig, CinchyModule, CinchyService } from "@cinchy-co/angular-sdk";

import { NumeralModule } from "ngx-numeral";
import { NgxSpinnerModule } from "ngx-spinner";

import { AppComponent } from "./app.component";

import { AppRoutingModule } from "./app-routing.module";
import { CinchyDynamicFormsModule } from "./dynamic-forms/cinchy-dynamic-forms.module";
import { CoreModule } from "./core/core.module";
import { CustomMaterialModule } from "./custom-material.module";

import { FormWrapperComponent } from "./pages/form-wrapper/form-wrapper.component";

import { ConfigService } from "./services/config.service";


export function appLoadFactory(config: ConfigService) {

  return () => config.loadConfig().toPromise();
}


export function getBaseUrl() {

  return document.getElementsByTagName("base")[0].href;
}


@NgModule({ declarations: [
        AppComponent,
        FormWrapperComponent
    ],
    bootstrap: [
        AppComponent
    ], imports: [AppRoutingModule,
        BrowserModule,
        BrowserAnimationsModule,
        CoreModule,
        CustomMaterialModule,
        CinchyDynamicFormsModule,
        CinchyModule.forRoot(),
        NgxSpinnerModule,
        NumeralModule.forRoot()], providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: appLoadFactory,
            deps: [ConfigService],
            multi: true
        },
        CinchyModule,
        CinchyService,
        {
            provide: CinchyConfig,
            useFactory: (config: ConfigService) => {
                return config.envConfig;
            },
            deps: [
                ConfigService
            ]
        },
        {
            provide: "BASE_URL",
            useFactory: getBaseUrl
        },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {}
