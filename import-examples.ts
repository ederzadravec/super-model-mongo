/**
 * Exemplos de como importar a biblioteca
 * Este arquivo demonstra todas as formas suportadas de import
 */

// ✅ Forma recomendada - Default import
import SuperModelMongo from '@ederzadravec/super-model-mongo';

// ✅ Named imports
import { createSuperModel } from '@ederzadravec/super-model-mongo';

// ✅ Import com tipos
import SuperModelMongo2, { ServiceInstance, MongoQuery } from '@ederzadravec/super-model-mongo';

// ✅ Apenas tipos
import type { FindAllResponse, DefaultOptions } from '@ederzadravec/super-model-mongo';

// ✅ Named imports de utilitários
import { removeUndefined, getAggregationPath } from '@ederzadravec/super-model-mongo';

export {
  SuperModelMongo,
  createSuperModel,
  SuperModelMongo2,
  removeUndefined,
  getAggregationPath
};

// Exemplo de uso
console.log('Todas as formas de import devem funcionar!');