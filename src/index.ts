// Import the main function
import createSuperModelImpl from './model';

// Re-export utility functions
export { removeUndefined, getAggregationPath, getUpdatePath } from './generators';

// Export types explicitly
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

// Export the main function as both named and default
export const createSuperModel = createSuperModelImpl;
export default createSuperModelImpl;