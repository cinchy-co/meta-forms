import { Injectable } from "@angular/core";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { DropdownDataset } from "./cinchy-dropdown-dataset";
import { DropdownOption } from "./cinchy-dropdown-options";

import { REGEX_COLUMN_NAME_IN_ERROR } from "../../../constants/regex-column-name-in-error.constant";

import { ErrorService } from "../../../services/error.service";
import { NotificationService } from "../../../services/notification.service";


@Injectable({
  providedIn: "root"
})
export class DropdownDatasetService {

  private _cachedDatasets: { [key: number]: DropdownDataset } = {};


  constructor(
    private _cinchyService: CinchyService,
    private _errorService: ErrorService,
    private _notificationService: NotificationService
  ) {}


  /**
   * Bind dropdownList (Link Type) from database
   *
   * @param linkTargetColumnId parameter of the link type column Cinchy ID
   * @param currentFieldJson
   * @param dropdownFilter Manual filter coming from Form fields table
   * @param rowId The current selected record of the form, used for filtering
   * @param needUpdate If not set, then a cached version of the set will be used if available
   * @param displayColumnsToIgnore in the case that the query fails because a particular display column was deleted, we
   *                             will want to try again without those columns
   */
  async getDropdownDataset(
      linkTargetColumnId: number,
      currentFieldJson: any,
      dropdownFilter?: string,
      rowId?: any,
      needUpdate?: boolean,
      displayColumnsToIgnore?: Array<string>
  ): Promise<DropdownDataset> {

    if (!needUpdate) {
      if (this._cachedDatasets[linkTargetColumnId]) {
        return this._cachedDatasets[linkTargetColumnId];
      }
    }

    // Get meta data for the cinchy link
    let tableColumnQuery: string = `
      SELECT
        tc.[Table].[Data Product].[Name] AS 'dataProduct',
        tc.[Table].[Name] AS 'table',
        tc.[Name] AS 'column'
      FROM [Cinchy].[Cinchy].[Table Columns] tc
      WHERE tc.[Deleted] IS NULL
        AND tc.[Table].[Deleted] IS NULL
        AND tc.[Cinchy ID] = ${linkTargetColumnId}`;

    let metadataQueryResult: Object[] = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

    if (!metadataQueryResult?.length) {
      return null;
    }

    let dataSetQuery: string;

    if (metadataQueryResult[0]["dataProduct"] === "Reference Data" && metadataQueryResult[0]["table"] === "Employees") {
      dataSetQuery = `
        SELECT
          t.[Cinchy ID] AS 'Id',
          t.[${metadataQueryResult[0]["column"]}] + ' (\' + [Role].[Name] + \')' AS 'Label'
        FROM [${metadataQueryResult[0]["dataProduct"]}].[${metadataQueryResult[0]["table"]}] t
        WHERE t.[Deleted] IS NULL`;
    }
    else {
      const setDisplayColumnQuery = currentFieldJson ? this._getDisplayColumnQuery(currentFieldJson, displayColumnsToIgnore) : '';
      const linkFilterExpression = currentFieldJson.linkFilterExpression;

      let whereCondition: string = `WHERE [Deleted] IS NULL`;

      if (linkFilterExpression) {
        whereCondition += ` AND ${linkFilterExpression}`;
      }

      if (dropdownFilter && !displayColumnsToIgnore?.some(column => dropdownFilter.includes(column))) {
        whereCondition += ` AND ${dropdownFilter}`;
      }

      if (setDisplayColumnQuery) {
        dataSetQuery = `
          SELECT
            ${setDisplayColumnQuery},
            [Cinchy ID] as 'Id',
            [${metadataQueryResult[0]["column"]}] as 'Label'
          FROM [${metadataQueryResult[0]["dataProduct"]}].[${metadataQueryResult[0]["table"]}]
          ${whereCondition};`;
      }
      else {
        dataSetQuery = `
          SELECT
            [Cinchy ID] AS 'Id',
            [${metadataQueryResult[0]["column"]}] AS 'Label'
          FROM [${metadataQueryResult[0]["dataProduct"]}].[${metadataQueryResult[0]["table"]}]
          ${whereCondition};`;
      }
    }

    const params = {
      "@cinchyid": rowId?.toString() || null
    };

    let optionArray: DropdownOption[] = [];

    try {
      (await this._cinchyService.executeCsql(dataSetQuery, params).toPromise()).queryResult.toObjectArray().forEach(function (row) {

        let label = row["Label"];

        let displayIndex = 0;

        while (row[`display-${displayIndex}`]) {
          label += `, ${row[`display-${displayIndex}`]}`;

          displayIndex++;
        }

        optionArray.push(new DropdownOption(row["Id"].toString(), row["Label"]?.toString(), label));
      });

      this._cachedDatasets[linkTargetColumnId] = new DropdownDataset(optionArray);

      return this._cachedDatasets[linkTargetColumnId];
    }
    catch (error: any) {
      // Target the specific response of "Column [COLUMN_NAME] could not be found", indicating that a display
      // column is not available or has been deleted. If that error occurs, compile a set of affected column names and
      // remove those from the set of requested display columns before resending the response
      if (error.cinchyException?.data.status === 400 && error.cinchyException?.data.details.includes("could not be found")) {
        const errorMessage = error.cinchyException.data.details as string;

        let columnMatch: Array<string> | null = errorMessage.substring(0).match(REGEX_COLUMN_NAME_IN_ERROR);
        let startingIndex = 0;

        // If this process needs to repeat for multiple display columns (and those display columns aren't all included
        // in the error), then use what was already provided and build on it
        const displayColumnsFoundInErrorResponse = displayColumnsToIgnore?.slice() ?? new Array<string>();

        while (columnMatch?.length) {
          startingIndex = errorMessage.indexOf(columnMatch[0]) + columnMatch[0].length;

          displayColumnsFoundInErrorResponse.push(
            columnMatch[0]
              .replace("[", "")
              .replace("]", "")
              // Needs to be done twice because we can't yet use .replaceAll
              .replace("\"", "")
              .replace("\"", "")
          );

          columnMatch = errorMessage.substring(startingIndex).match(REGEX_COLUMN_NAME_IN_ERROR);
        }

        // Can use matchAll to avoid the loop when targeting ES2020 or later
        // errorMessage.matchAll(/\[([^\[\]]+)]/g); -> [[`[COLUMN_NAME]`, `COLUMN_NAME`]], ... ]

        return await this.getDropdownDataset(linkTargetColumnId, currentFieldJson, dropdownFilter, rowId, needUpdate, displayColumnsFoundInErrorResponse);
      }
      else {
        this._notificationService.displayErrorMessage(
<<<<<<< HEAD
          `Could not retrieve linked options for [${metadataQueryResult[0]["dataProduct"]}].[${metadataQueryResult[0]["table"]}]. ${this._errorService.getErrorMessage(error)}`
=======
          `Could not retrieve linked options for [${metadataQueryResult[0]["Domain"]}].[${metadataQueryResult[0]["Table"]}]. ${this._errorService.getErrorMessage(error)}`
>>>>>>> master
        );
      }
    }
  }


  /**
   * Generates a series of SELECT clauses to match the display columns associated with the target field
   *
   * @param currentFieldJson A JSON construct representing metadata associated with the target field
   * @param displayColumnsToIgnore Any display columns to not generate statements for. Used when a particular column
   *                               is known to be erroneous
   */
  private _getDisplayColumnQuery(currentFieldJson: { [key: string]: any }, displayColumnsToIgnore: Array<string> = []): string {

    let displayColumnQueryItems: Array<string> = new Array<string>();

    if (currentFieldJson.SearchDisplayColumns?.length) {
      let displayIndex = 0;

      currentFieldJson.SearchDisplayColumns.forEach(
        (column: { name: string }, index: number) => {

          const key: string = column.name ? column.name.split(".")[0] : "";

          if (key && !displayColumnsToIgnore.includes(key)) {
            displayColumnQueryItems.push(`[${key}] as 'display-${displayIndex++}'`)
          }
        }
      );
    }

    return displayColumnQueryItems.join(",");
  }
}
