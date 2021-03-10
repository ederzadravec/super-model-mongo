import objectid from 'objectid';
import { Model, Query, ObjectId } from 'mongoose';

import { removeUndefined, getAggregationPath, getUpdatePath } from './generators';

import Types from './model.d';

export default (model: Model<any>, defaultOptions: Types.DefaultOptions = {}): Types.ServiceInstance => {
  const oid = (id: string):ObjectId  => objectid(id);

  const findOne = (req: Types.Request = {}, query: any = {}, ...props): Promise<any> => {
    const populate = defaultOptions.populate;

    return model.findOne(query, ...props).then(async (data) => {
      const newData = populate ? await populate(data) : data;

      return newData ? newData.toObject() : newData;
    });
  };

  const findAll = async (
    req: Types.Request = {},
    query: any = {},
    options: Types.FindAllOptions = {}
  ): Promise<Types.FindAllResponse> => {
    const limit = parseInt(req?.query?.limit || '10', 10);
    const page = parseInt(req?.query?.page || '1', 10);

    const sort = options.sort || { _id: 1 };
    const project = options.project || '-nenhum';
    const populate = defaultOptions.populate;

    const result = await model
      .aggregate([
        {
          $facet: {
            data: [
              {
                $match: query,
              },
              {
                $skip: (page - 1) * limit,
              },
              {
                $limit: limit,
              },
              {
                $sort: sort,
              },
            ],
            total: [
              {
                $match: query,
              },
              { $count: 'total' },
            ],
          },
        },
      ])
      .project(project);

    const newResult = populate ? await populate(result) : result;

    return {
      data: newResult[0].data || [],
      total: newResult[0]?.total[0]?.total || 0,
      page,
      limit,
    };
  };

  const create = (req: Types.Request = {}, data = {}): Promise<any> => {
    return model.create(removeUndefined(data));
  };

  const update = (
    req: Types.Request = {},
    query: any = {},
    data = {}
  ): Query<{ ok: number; n: number; nModified: number }, any> => {
    return model.updateOne(query, removeUndefined(data));
  };

  const remove = (
    req: Types.Request = {},
    query: any = {}
  ): Query<{ ok: number; n: number; nModified: number }, any> => {
    return model.remove(query);
  };

  const hasAny = async (req: Types.Request = {}, fields?: object, exclude?: string): Promise<string[]> => {
    const fieldsKey = Object.keys(fields);
    const query = fieldsKey.map((item) => ({ [item]: fields[item] }));

    const result = await model.find({ $or: query, _id: { $ne: oid(exclude) } });

    if (!result) return [];

    return result.reduce((acc, item) => {
      const hasKeys = fieldsKey.filter((key) => item[key] === fields[key]);

      return [...acc, ...hasKeys];
    }, []);
  };

  const findOnePath = async (req: Types.Request = {}, query: any = {}, path = ''): Promise<any> => {
    const populate = defaultOptions.populate;

    const pathFilter = getAggregationPath(path);
    const document = await model.aggregate([
      {
        $match: query,
      },
      ...pathFilter,
    ]);

    return populate ? populate(document[0]) : document[0];
  };

  const findAllPath = async (
    req: Types.Request = {},
    query: any = {},
    path = '',
    options: Types.FindAllOptions = {}
  ): Promise<Types.FindAllResponse> => {
    const limit = parseInt(req?.query?.limit || '10', 10);
    const page = parseInt(req?.query?.page || '1', 10);

    const sort = options.sort || { _id: 1 };
    const project = options.project || '-nenhum';
    const populate = defaultOptions.populate;

    const pathFilter = getAggregationPath(path);

    const result = await model
      .aggregate([
        {
          $match: query,
        },
        ...pathFilter,
        {
          $facet: {
            data: [
              {
                $skip: (page - 1) * limit,
              },
              {
                $limit: limit,
              },
              {
                $sort: sort,
              },
            ],
            total: [{ $count: 'total' }],
          },
        },
      ])
      .project(project);

    const newResult = populate ? await populate(result) : result;

    return {
      data: newResult[0].data || [],
      total: newResult[0]?.total[0]?.total || 0,
      page,
      limit,
    };
  };

  const createPath = async (req: Types.Request = {}, query: any = {}, path = '', data = {}):  Promise<{ ok: number, n: number, nModified: number }> => {
    return model.updateOne(query, ...getUpdatePath('create', path, data));
  };

  const updatePath = async (req: Types.Request = {}, query: any = {}, path = '', data = {}):  Promise<{ ok: number, n: number, nModified: number }> => {
    return model.updateOne(query, ...getUpdatePath('update', path, data));
  };

  const removePath = async (req: Types.Request = {}, query: any = {}, path = ''):  Promise<{ ok: number, n: number, nModified: number }> => {
    return model.updateOne(query, ...getUpdatePath('remove', path));
  };

  return {
    oid,

    aggregate: (...props) => model.aggregate(...props),
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
