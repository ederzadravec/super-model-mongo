import createSuperModel from './model';

// Named exports
export { createSuperModel };
export { removeUndefined, getAggregationPath, getUpdatePath } from './generators';

// Export types
export type {
  ServiceInstance,
  MongoQuery,
  MongoUpdate,
  MongoProjection,
  FindAllOptions,
  FindAllResponse,
  PaginationOptions,
  DefaultOptions,
  UpdateResult
} from './model.d';

// Default export para permitir import SuperModelMongo from '@ederzadravec/super-model-mongo'
export default createSuperModel;