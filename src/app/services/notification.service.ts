import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

import { DEFAULT_SNACKBAR_CONFIG } from "../constants/default-snackbar-config.constant";


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private static readonly _DEFAULT_DURATION: number = 5000;


  constructor(
    private _snack: MatSnackBar
  ) {}

  // Options from ngx-toastr
  /*
      closeButton: true,
      enableHtml: true,
      preventDuplicates: true,
      tapToDismiss: false
   */

  /**
   * Displays the given error message as a snack. Error notifications must be manually dismissed.
   */
  displayErrorMessage(message: string, action: string = "dismiss"): void {

    this._snack.open(
      `${message}`,
      action,
      {
        ...DEFAULT_SNACKBAR_CONFIG,
        panelClass: ["snack", "snack-error"]
      }
    );
  }


  /**
   * Displays the given info message as a snack
   */
  displayInfoMessage(message: string, action: string = "OK", duration?: number): void {

    this._snack.open(
      `${message}`,
      action,
      {
        ...DEFAULT_SNACKBAR_CONFIG,
        panelClass: ["snack", "snack-info"],
        duration: duration || NotificationService._DEFAULT_DURATION
      }
    );
  }


  /**
   * Displays the given success message as a snack
   */
  displaySuccessMessage(message: string, action: string = "OK", duration?: number): void {

    this._snack.open(
      `${message}`,
      action,
      {
        ...DEFAULT_SNACKBAR_CONFIG,
        panelClass: ["snack", "snack-success"],
        duration: duration || NotificationService._DEFAULT_DURATION
      }
    );
  }


  /**
   * Displays the given warning message as a snack
   */
  displayWarningMessage(message: string, action: string = "dismiss", duration?: number): void {

    this._snack.open(
      `${message}`,
      action,
      {
        ...DEFAULT_SNACKBAR_CONFIG,
        panelClass: ["snack", "snack-warning"],
        duration: duration || NotificationService._DEFAULT_DURATION
      }
    );
  }
}
