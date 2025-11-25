import { Aggregate, Query, ObjectId, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export interface PaginationOptions {
  limit?: number;
  page?: number;
}

export interface DefaultOptions<T = unknown> {
  populate?: (data: T | T[] | null) => Promise<T | T[] | null> | T | T[] | null;
}

export interface FindAllOptions extends PaginationOptions {
  sort?: Record<string, 1 | -1>;
  project?: string | Record<string, 0 | 1>;
}

export interface FindAllResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateResult {
  ok?: number;
  n?: number;
  nModified?: number;
  acknowledged?: boolean;
  matchedCount?: number;
  modifiedCount?: number;
  upsertedCount?: number;
  upsertedId?: ObjectId;
}

export type PathOperation = 'create' | 'update' | 'remove';

export type MongoQuery<T = unknown> = FilterQuery<T>;
export type MongoUpdate<T = unknown> = UpdateQuery<T>;
export type MongoProjection = string | Record<string, 0 | 1>;

export type DocumentShape<T> = T extends Document ? T : T & Document;

export interface ServiceInstance<T = Document, TDocument = DocumentShape<T>> {
  aggregate: (pipeline: Array<Record<string, unknown>>) => Aggregate<unknown[]>;

  findOne: (
    query?: MongoQuery<TDocument>,
    projection?: MongoProjection,
    options?: QueryOptions
  ) => Promise<T | null>;
  findAll: (
    query?: MongoQuery<TDocument>,
    options?: FindAllOptions
  ) => Promise<FindAllResponse<T>>;
  create: (data?: Partial<T>) => Promise<T>;
  update: (
    query?: MongoQuery<TDocument>,
    data?: MongoUpdate<TDocument>
  ) => Query<UpdateResult, TDocument>;
  remove: (query?: MongoQuery<TDocument>) => Query<UpdateResult, TDocument>;

  hasAny: (fields?: Record<string, unknown>, exclude?: string) => Promise<string[]>;

  findOnePath: <R = unknown>(query: MongoQuery<TDocument>, path: string) => Promise<R | null>;
  findAllPath: <R = unknown>(
    query: MongoQuery<TDocument>,
    path: string,
    options?: FindAllOptions
  ) => Promise<FindAllResponse<R>>;
  createPath: (
    query: MongoQuery<TDocument>,
    path: string,
    data: Record<string, unknown>
  ) => Promise<UpdateResult>;
  updatePath: (
    query: MongoQuery<TDocument>,
    path: string,
    data: Record<string, unknown>
  ) => Promise<UpdateResult>;
  removePath: (query: MongoQuery<TDocument>, path: string) => Promise<UpdateResult>;
}

export interface SuperModelFactory {
  <T = any>(
    model: import('mongoose').Model<any>,
    defaultOptions?: DefaultOptions<any>
  ): ServiceInstance<T, any>;
}

declare const createSuperModel: SuperModelFactory;
export default createSuperModel;
