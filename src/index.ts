import createSuperModel from './model';

export { default as createSuperModel } from './model';
export * from './model.d';
export { removeUndefined, getAggregationPath, getUpdatePath } from './generators';

// Export default para permitir import SuperModelMongo from '@ederzadravec/super-model-mongo'
export default createSuperModel;