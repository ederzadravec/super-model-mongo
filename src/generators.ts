import * as R from 'ramda';
import objectid from 'objectid';

/**
 * Recursively removes undefined values from objects and arrays
 * @param data - Data to clean
 * @returns Cleaned data without undefined values
 */
export const removeUndefined = (data: unknown): unknown => {
  if (!data) {
    return data;
  }

  const isUndefined = (value: unknown): boolean => R.type(value) === 'Undefined' || value === 'undefined';
  const notObjectId = (value: unknown): boolean => !objectid.isValid(value);

  const removeFF = (value: unknown): unknown => {
    if (R.type(value) === 'Array') {
      const arrayValue = value as unknown[];
      const newValue = arrayValue.filter((item: unknown) => !isUndefined(item));
      return newValue.map(removeFF);
    }

    if (R.type(value) === 'Object') {
      const objectValue = value as Record<string, unknown>;
      return Object.keys(objectValue).reduce((acc: Record<string, unknown>, key: string) => {
        if (['Object', 'Array'].indexOf(R.type(objectValue[key])) !== -1 && notObjectId(objectValue[key])) {
          return { ...acc, [key]: removeFF(objectValue[key]) };
        }

        return isUndefined(objectValue[key]) ? acc : { ...acc, [key]: objectValue[key] };
      }, {});
    }

    return value;
  };

  return removeFF(data);
};

/**
 * Generates aggregation pipeline stages for nested path operations
 * @param data - Path string in format "field" or "field.id:value" or "field.id:value.subfield"
 * @returns Array of aggregation pipeline stages
 */
export const getAggregationPath = (data: string): Array<Record<string, unknown>> => {
  if (!data || typeof data !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  const levels = data.split('.');

  const stages = levels.reduce((acc: Array<Record<string, unknown>>, level: string) => {
    const [field, value] = level.split(':');
    const stage: Array<Record<string, unknown>> = [];

    if (!field) {
      throw new Error(`Invalid path segment: ${level}`);
    }

    if (field && value) {
      const key = field === 'id' ? '_id' : field;
      
      if (!objectid.isValid(value)) {
        throw new Error(`Invalid ObjectId in path: ${value}`);
      }

      stage.push({
        $match: {
          [key]: objectid(value),
        },
      });
    }

    if (field && !value) {
      stage.push({ $unwind: `$${field}` });
      stage.push({
        $replaceRoot: {
          newRoot: `$${field}`,
        },
      });
    }

    return [...acc, ...stage];
  }, []);

  return stages;
};

/**
 * Generates update operations for nested path modifications
 * @param type - Type of operation: 'create', 'update', or 'remove'
 * @param path - Path string in format "field" or "field.id:value.subfield"
 * @param data - Data to use in the operation (optional for remove)
 * @returns Tuple with update query and options
 */
export const getUpdatePath = (
  type: 'create' | 'update' | 'remove',
  path: string,
  data?: unknown
): [data: Record<string, unknown>, options: Record<string, unknown>] => {
  if (!path || typeof path !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  if (['create', 'update', 'remove'].indexOf(type) === -1) {
    throw new Error('Type must be one of: create, update, remove');
  }

  /**
   * Generates array filter variable names dynamically
   * This approach supports unlimited nesting depth
   * @param index - The index for which to generate a variable name
   * @returns A variable name like 'a', 'b', ..., 'z', 'aa', 'ab', etc.
   */
  const generateVarName = (index: number): string => {
    let result = '';
    let current = index;
    
    do {
      result = String.fromCharCode(97 + (current % 26)) + result;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);
    
    return result;
  };

  const TYPES = {
    create: '$push',
    update: '$set',
    remove: '$pull',
  };

  const levels = path.split('.');

  if (levels.length === 0) {
    throw new Error('Invalid path: cannot be empty');
  }

  interface AccumulatorType {
    map: string[];
    filter: Array<Record<string, unknown>>;
    data: unknown;
  }

  const result = levels.reduce(
    (acc: AccumulatorType, level: string) => {
      const [field, value] = level.split(':');

      if (!field) {
        throw new Error(`Invalid path segment: ${level}`);
      }

      const newFilter: Array<Record<string, unknown>> = [];
      const newMap: string[] = [];
      let newData = acc.data;

      const isLastToRemove = type === 'remove' && acc.map.length === levels.length - 1;

      if (field && !value) {
        newMap.push(field);
      }

      if (field && value && !isLastToRemove) {
        if (!objectid.isValid(value)) {
          throw new Error(`Invalid ObjectId in path: ${value}`);
        }

        const key = field === 'id' ? '_id' : field;
        const letter = generateVarName(acc.filter.length);

        newMap.push(`$[${letter}]`);
        newFilter.push({ [`${letter}.${key}`]: objectid(value) });
      }

      if (isLastToRemove) {
        if (!objectid.isValid(value)) {
          throw new Error(`Invalid ObjectId in path: ${value}`);
        }

        const key = field === 'id' ? '_id' : field;
        newData = { [key]: objectid(value) };
      }

      return {
        map: [...acc.map, ...newMap],
        filter: [...acc.filter, ...newFilter],
        data: newData,
      };
    },
    { map: [], filter: [], data }
  );

  const queryType = TYPES[type];

  return [
    {
      [queryType]: {
        [result.map.join('.')]: result.data,
      },
    },
    {
      arrayFilters: result.filter,
    },
  ];
};
