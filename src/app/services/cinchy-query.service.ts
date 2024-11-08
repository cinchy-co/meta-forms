import { Observable, of, Subject, throwError } from "rxjs";
import { catchError, map, takeUntil, tap } from "rxjs/operators";

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { Cinchy, CinchyService } from "@cinchy-co/angular-sdk";

import { IFormFieldMetadata } from "../models/form-field-metadata.model";
import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";
import { ILookupRecord } from "../models/lookup-record.model";

import { AppStateService } from "./app-state.service";


@Injectable({
  providedIn: "root"
})
export class CinchyQueryService {

  private readonly DATA_PRODUCT: string = "Cinchy Forms";
  // private readonly DATA_PRODUCT: string = "Sandbox";

  private _formMetadataCache: { [formId: string] : IFormMetadata } = {};
  private _formSectionsMetadataCache: { [formId: string] : IFormSectionMetadata[] } = {};
  private _formFieldsMetadataCache: { [formId: string]: IFormFieldMetadata[] } = {};


  /**
   * This will allow us to cancel a retrieval of lookup records that is still in flight when another filtered response comes in.
   */
  public resetLookupRecords: Subject<void> = new Subject<void>();

  /**
   * Search is limited to the first N records per CIN-02737.
   */
  public static readonly LOOKUP_RECORD_LABEL_COUNT: number = 10;


  constructor(
    private _appStateService: AppStateService,
    private _cinchyService: CinchyService,
    private _httpClient: HttpClient
  ) {}


  getFilesInCell(columnName: string, dataProduct: string, tableName: string, rowId: number): Observable<Array<{ fileId: number, fileName: string }>> {

    const query: string = `
      SELECT
        [${columnName}].[Cinchy ID] AS 'fileIds',
        [${columnName}].[File Name] AS 'fileNames'
      FROM [${dataProduct}].[${tableName}]
      WHERE [Cinchy ID]=${rowId};`;

    return this._cinchyService.executeCsql(query, null).pipe(map(
      (response) => {

        let result: Array<{ fileId: number, fileName: string }> = [];

        const resultRecord: Array<{ fileIds: string, fileNames: string }> =
          response.queryResult.toObjectArray() as Array<{ fileIds: string, fileNames: string }>;

        if (resultRecord?.length && resultRecord[0]["fileIds"] && resultRecord[0]["fileNames"]) {
          const fileIds: Array<number> = resultRecord[0]["fileIds"]?.toString().split(",").map(x => parseInt(x.trim())) ?? [];
          const fileNames: Array<string> = resultRecord[0]["fileNames"]?.toString().split(",").map(x => x.trim()) ?? [];

          fileIds.forEach((id: number, index: number): void => {

            result.push({ fileId: id, fileName: fileNames[index] });
          });
        }

        return result;
      }
    ));
  }


  getFormMetadata(formId?: string): Observable<IFormMetadata> {

    const id: string = formId ?? this._appStateService.formId;

    if (this._formMetadataCache[id]) {
      return of(this._formMetadataCache[id]);
    }

    const queryName: string = "Get Form Metadata";
    const params: any = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DATA_PRODUCT, queryName, params).pipe(
      map((response: { queryResult: Cinchy.QueryResult }): IFormMetadata => {

        const resultArray: Array<any> = response?.queryResult?.toObjectArray();

        return resultArray?.length ? resultArray[0] as IFormMetadata : null;
      }),
      tap((result: IFormMetadata): void => {
        if (result) {
          this._formMetadataCache[id] = result;
        }
      }),
      catchError((error: any) => {

        return throwError(error);
      })
    );
  }


  getFormSectionsMetadata(formId?: string): Observable<IFormSectionMetadata[]> {

    const id: string = formId ?? this._appStateService.formId;

    if (this._formSectionsMetadataCache[id]) {
      return of(this._formSectionsMetadataCache[id]);
    }

    const query: string = "Get Form Sections Metadata";
    const params: any = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DATA_PRODUCT, query, params).pipe(
      map((response: { queryResult: Cinchy.QueryResult }) => {

        return <IFormSectionMetadata[]>response?.queryResult?.toObjectArray();
      }),
      tap((result: IFormSectionMetadata[]): void => {
        if (result)
          this._formSectionsMetadataCache[id] = result;
      }),
      catchError((error: any) => {

        return throwError(error);
      })
    );
  }


  getFormFieldsMetadata(formId?: string): Observable<IFormFieldMetadata[]> {

    const id: string = formId ?? this._appStateService.formId;

    if (this._formFieldsMetadataCache[id]) {
      return of(this._formFieldsMetadataCache[id]);
    }

    const query: string = "Get Form Fields Metadata";
    const params: any = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DATA_PRODUCT, query, params).pipe(
      map((response): Array<IFormFieldMetadata> => {

        return response?.queryResult?.toObjectArray() as Array<IFormFieldMetadata>;
      }),
      tap((result: IFormFieldMetadata[]): void => {

        if (result) {
          this._formFieldsMetadataCache[id] = result;
        }
      }),
      catchError((error: any) => {

        return throwError(error);
      })
    );
  }


  getLookupRecords(subtitleColumn: string, dataProduct: string, table: string, lookupFilter?: string, limitResults?: boolean): Observable<ILookupRecord[]> {

    // If more than LOOKUP_RECORD_LABEL_COUNT records are retrieved, we know to indicate that additional records are available for the given filter.
    const selectStatement: string = limitResults ? `SELECT TOP ${CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT + 1}` : `SELECT`;
    const subCol: string = subtitleColumn ?? "Cinchy ID";

    const query: string = `
      ${selectStatement}
        [Cinchy ID] as 'id',
        [${subCol}] as 'label'
      FROM [${dataProduct}].[${table}]
      WHERE [Deleted] IS NULL
        AND [${subCol}] IS NOT NULL
        AND trim(CAST([${subCol}] AS VARCHAR)) != ''
        ${lookupFilter ? `AND ${lookupFilter}` : ''}
      ORDER BY [${subCol}];`;

    return this._cinchyService.executeCsql(query, null).pipe(
      takeUntil(this.resetLookupRecords),
      map((response): Array<ILookupRecord> => {

        return response?.queryResult?.toObjectArray() as Array<ILookupRecord>;
      }),
      catchError((error: any) => {

        return throwError(error);
      })
    );
  }


  uploadFiles(files: File[], uploadUrl: string): Observable<any> {

    if (files && uploadUrl) {
      let formData: FormData = new FormData();

      // Add the uploaded file to the form data collection
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }
      }

      return this._httpClient.post(uploadUrl, formData);
    }

    return null;
  }


  updateFilesInCell(fileIds: number[], columnName: string, dataProduct: string, tableName: string, rowId: number): Observable<any> {

    const ids: string = fileIds.length > 0 ? fileIds?.join(',1,') + ',1' : '';
    const query: string = `
      UPDATE t
      SET t.[${columnName}]='${ids}'
      FROM [${dataProduct}].[${tableName}] t
      WHERE [Deleted] IS NULL
        AND [Cinchy ID]=${rowId};`;

    return this._cinchyService.executeCsql(query, null).pipe(
      map(
        (result): Array<{fileId: number, fileName: string}> => {

          return result.queryResult.toObjectArray() as Array<{ fileId: number, fileName: string }>
        }
      ),
      catchError((error: any) => {

        return throwError(error);
      })
    );
  }
}
