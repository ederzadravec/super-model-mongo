import { Aggregate, Query, ObjectId, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export interface PaginationOptions {
  limit?: number;
  page?: number;
}

export interface DefaultOptions<T = Document> {
  populate?: (data: T | T[] | null) => Promise<T | T[] | null> | T | T[] | null;
}

export interface FindAllOptions extends PaginationOptions {
  sort?: Record<string, 1 | -1>;
  project?: string | Record<string, 0 | 1>;
}

export interface FindAllResponse<T = Document> {
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

export type MongoQuery<T = Document> = FilterQuery<T>;
export type MongoUpdate<T = Document> = UpdateQuery<T>;
export type MongoProjection = string | Record<string, 0 | 1>;

export interface ServiceInstance<T extends Document = Document> {
  aggregate: (pipeline: Array<Record<string, unknown>>) => Aggregate<unknown[]>;

  findOne: (query?: MongoQuery<T>, projection?: MongoProjection, options?: QueryOptions) => Promise<T | null>;
  findAll: (query?: MongoQuery<T>, options?: FindAllOptions) => Promise<FindAllResponse<T>>;
  create: (data?: Partial<T>) => Promise<T>;
  update: (query?: MongoQuery<T>, data?: MongoUpdate<T>) => Query<UpdateResult, T>;
  remove: (query?: MongoQuery<T>) => Query<UpdateResult, T>;

  hasAny: (fields?: Record<string, unknown>, exclude?: string) => Promise<string[]>;

  findOnePath: <R = unknown>(query: MongoQuery<T>, path: string) => Promise<R | null>;
  findAllPath: <R = unknown>(
    query: MongoQuery<T>,
    path: string,
    options?: FindAllOptions
  ) => Promise<FindAllResponse<R>>;
  createPath: (query: MongoQuery<T>, path: string, data: Record<string, unknown>) => Promise<UpdateResult>;
  updatePath: (query: MongoQuery<T>, path: string, data: Record<string, unknown>) => Promise<UpdateResult>;
  removePath: (query: MongoQuery<T>, path: string) => Promise<UpdateResult>;
}

export interface SuperModelFactory {
  <T extends Document = Document>(model: import('mongoose').Model<T>, defaultOptions?: DefaultOptions<T>): ServiceInstance<T>;
}

declare const createSuperModel: SuperModelFactory;
export default createSuperModel;
