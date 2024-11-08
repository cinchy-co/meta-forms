import { IColumnEntitlements } from "./column-entitlements";


/**
 * Describes the permissions associated with interacting with a table
 */
export interface ITableEntitlements {
  accessIsDefinedForCurrentUser: boolean;
  canAddRows: boolean;
  canApproveChanges: boolean;
  canDeleteRows: boolean;
  canDesignTable: boolean;
  canManageControls: boolean;
  columnEntitlements: Array<IColumnEntitlements>;
  tableDataProduct: string;
  tableGuid: string;
  tableId: number;
  tableName: string;
  username: string;
}
