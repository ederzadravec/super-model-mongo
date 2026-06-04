import { Model, UpdateQuery, QueryOptions } from 'mongoose';
import objectid from 'objectid';

import { removeUndefined, getAggregationPath, getUpdatePath } from './generators';

import * as Types from './model.d';

const toProjectObject = (project: string | Record<string, 0 | 1>): Record<string, 0 | 1> => {
  if (typeof project === 'object') return project;
  return project.split(' ').reduce<Record<string, 0 | 1>>((acc, field) => {
    if (!field) return acc;
    if (field.startsWith('-')) return { ...acc, [field.slice(1)]: 0 };
    return { ...acc, [field]: 1 };
  }, {});
};

const createSuperModel = <T = any>(
  model: Model<any>,
  defaultOptions: Types.DefaultOptions<any> = {}
): Types.ServiceInstance<T, any> => {
  type ModelDocument = any;
  if (!model) {
    throw new Error('Model is required to create a super model instance');
  }

  const findOne = async (
    query: Types.MongoQuery<ModelDocument> = {},
    projection?: Types.MongoProjection,
    options?: QueryOptions
  ): Promise<T | null> => {
    try {
      const populate = defaultOptions.populate;
      const data = await model.findOne(query, projection, options);

      if (!data) {
        return null;
      }

      const newData = populate ? await populate(data) : data;
      return newData as T | null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in findOne: ${errorMessage}`);
    }
  };

  const findAll = async (
    query: Types.MongoQuery<ModelDocument> = {},
    options: Types.FindAllOptions = {}
  ): Promise<Types.FindAllResponse<T>> => {
    try {
      const limit = Math.max(1, Math.min(100, options.limit || 10));
      const page = Math.max(1, options.page || 1);
      const sort = options.sort || { _id: 1 };
      const project = options.project;
      const populate = defaultOptions.populate;

      const dataPipeline: Record<string, unknown>[] = [
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      if (project) {
        dataPipeline.push({ $project: toProjectObject(project) });
      }

      const result = await model.aggregate([
        { $match: query },
        { $sort: sort },
        {
          $facet: {
            data: dataPipeline,
            total: [{ $count: 'total' }],
          },
        },
      ]);

      const aggregationResult = result as Array<{
        data: ModelDocument[];
        total: Array<{ total: number }>;
      }>;

      const rawData = (aggregationResult?.[0]?.data || []) as T[];
      const populatedData = populate ? (await populate(rawData)) as T[] : rawData;

      return {
        data: populatedData,
        total: aggregationResult?.[0]?.total?.[0]?.total || 0,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in findAll: ${errorMessage}`);
    }
  };

  const create = async (data: Partial<T> = {}): Promise<T> => {
    try {
      const document = await model.create(removeUndefined(data) as ModelDocument);
      return document as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in create: ${errorMessage}`);
    }
  };

  const update = async (
    query: Types.MongoQuery<ModelDocument> = {},
    data: Types.MongoUpdate<ModelDocument> = {}
  ): Promise<Types.UpdateResult> => {
    return model.updateOne(query, removeUndefined(data) as Types.MongoUpdate<ModelDocument>);
  };

  const remove = async (query: Types.MongoQuery<ModelDocument> = {}): Promise<Types.UpdateResult> => {
    return model.deleteMany(query);
  };

  const hasAny = async (fields?: Record<string, unknown>, exclude?: string): Promise<string[]> => {
    try {
      if (!fields || typeof fields !== 'object') {
        return [];
      }

      const fieldsKey = Object.keys(fields);
      if (fieldsKey.length === 0) {
        return [];
      }

      const query = fieldsKey.map((item) => ({ [item]: fields[item] }));
      const excludeQuery = exclude ? { _id: { $ne: objectid(exclude) } } : {};

      const findQuery = { $or: query, ...excludeQuery } as Types.MongoQuery<ModelDocument>;
      const result = await model.find(findQuery).select(fieldsKey.join(' '));

      if (!result || result.length === 0) {
        return [];
      }

      return result.reduce((acc: string[], item: ModelDocument) => {
        const hasKeys = fieldsKey.filter((key) => (item as unknown as Record<string, unknown>)[key] === fields[key]);
        return [...acc, ...hasKeys];
      }, []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in hasAny: ${errorMessage}`);
    }
  };

  const findOnePath = async <R = unknown>(
    query: Types.MongoQuery<ModelDocument> = {},
    path = ''
  ): Promise<R | null> => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      const populate = defaultOptions.populate;
      const pathFilter = getAggregationPath(path);

      const document = await model.aggregate([{ $match: query }, ...pathFilter]);

      if (!document || document.length === 0) {
        return null;
      }

      const result = populate ? await populate(document[0]) : document[0];
      return result as R | null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in findOnePath: ${errorMessage}`);
    }
  };

  const findAllPath = async <R = unknown>(
    query: Types.MongoQuery<ModelDocument> = {},
    path = '',
    options: Types.FindAllOptions = {}
  ): Promise<Types.FindAllResponse<R>> => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      const limit = Math.max(1, Math.min(100, options.limit || 10));
      const page = Math.max(1, options.page || 1);
      const sort = options.sort || { _id: 1 };
      const project = options.project;
      const populate = defaultOptions.populate;

      const pathFilter = getAggregationPath(path);

      const dataPipeline: Record<string, unknown>[] = [
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      if (project) {
        dataPipeline.push({ $project: toProjectObject(project) });
      }

      const result = await model.aggregate([
        { $match: query },
        ...pathFilter,
        { $sort: sort },
        {
          $facet: {
            data: dataPipeline,
            total: [{ $count: 'total' }],
          },
        },
      ]);

      const aggregationResult = result as Array<{
        data: R[];
        total: Array<{ total: number }>;
      }> | null;

      const rawData = (aggregationResult?.[0]?.data || []) as R[];
      const populatedData = populate ? (await populate(rawData)) as R[] : rawData;

      return {
        data: populatedData,
        total: aggregationResult?.[0]?.total?.[0]?.total || 0,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in findAllPath: ${errorMessage}`);
    }
  };

  const createPath = async (
    query: Types.MongoQuery<ModelDocument> = {},
    path = '',
    data: Record<string, unknown> = {}
  ): Promise<Types.UpdateResult> => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      const [updateQuery, options] = getUpdatePath('create', path, data);
      return await model.updateOne(query, updateQuery as UpdateQuery<ModelDocument>, options);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in createPath: ${errorMessage}`);
    }
  };

  const updatePath = async (
    query: Types.MongoQuery<ModelDocument> = {},
    path = '',
    data: Record<string, unknown> = {}
  ): Promise<Types.UpdateResult> => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      const [updateQuery, options] = getUpdatePath('update', path, data);
      return await model.updateOne(query, updateQuery as UpdateQuery<ModelDocument>, options);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in updatePath: ${errorMessage}`);
    }
  };

  const removePath = async (
    query: Types.MongoQuery<ModelDocument> = {},
    path = ''
  ): Promise<Types.UpdateResult> => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      const [updateQuery, options] = getUpdatePath('remove', path);
      return await model.updateOne(query, updateQuery as UpdateQuery<ModelDocument>, options);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Error in removePath: ${errorMessage}`);
    }
  };

  return {
    aggregate: (pipeline: Array<Record<string, unknown>>) => model.aggregate(pipeline),
    findOne,
    findAll,
    create,
    update,
    remove,

    hasAny,

    findOnePath,
    findAllPath,
    createPath,
    updatePath,
    removePath,
  };
};

export default createSuperModel;
