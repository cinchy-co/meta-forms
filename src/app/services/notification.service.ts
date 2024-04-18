import { Injectable } from "@angular/core";

import { ToastrService } from "ngx-toastr";


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private static readonly _DEFAULT_TIMEOUT: number = 5000;
  private static readonly _DEFAULT_EXTENDED_TIMEOUT: number = 5000;


  constructor(
    private _toastrService: ToastrService
  ) {}


  /**
   * Displays the given error message as a toast. Error notifications must be manually dismissed.
   */
  displayErrorMessage(message: string, title: string = "Error"): void {

    this._toastrService.error(
      `${message}`,
      title,
      {
        disableTimeOut: true
      }
    );
  }


  /**
   * Displays the given info message as a toast
   */
  displayInfoMessage(message: string, title: string = "Info", timeout?: number): void {

    this._toastrService.info(
      `${message}`,
      title,
      {
        timeOut: timeout || NotificationService._DEFAULT_TIMEOUT,
        extendedTimeOut: timeout || NotificationService._DEFAULT_EXTENDED_TIMEOUT
      }
    );
  }


  /**
   * Displays the given success message as a toast
   */
  displaySuccessMessage(message: string, title: string = "Success", timeout?: number): void {

    this._toastrService.success(
      `${message}`,
      title,
      {
        timeOut: timeout || NotificationService._DEFAULT_TIMEOUT,
        extendedTimeOut: timeout || NotificationService._DEFAULT_EXTENDED_TIMEOUT
      }
    );
  }


  /**
   * Displays the given warning message as a toast
   */
  displayWarningMessage(message: string, title: string = "Warning", timeout?: number): void {

    this._toastrService.warning(
      `${message}`,
      title,
      {
        timeOut: timeout || NotificationService._DEFAULT_TIMEOUT,
        extendedTimeOut: timeout || NotificationService._DEFAULT_EXTENDED_TIMEOUT
      }
    );
  }
}
