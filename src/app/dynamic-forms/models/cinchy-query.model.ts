// TODO: remove this pattern -- unify to a single entity
export interface IQuery {
  query: string;
  params: { [key: string]: any };
  attachedFilesInfo?: [{ dataProduct: string; table: string; column: string; fileName: string }];
}

export class Query implements IQuery {
  constructor(
    public query: string,
    public params: { [key: string]: any },
    public attachedFilesInfo?: any
  ) {}
}
