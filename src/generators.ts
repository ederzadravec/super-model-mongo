import * as R from 'ramda';
import objectid from 'objectid';

export const removeUndefined = (data: object | (object | string)[]): object | (object | string)[] => {
  const isUndefined = (value) => R.type(value) === 'Undefined' || value === 'undefined';
  const notObjectId = (value) => !objectid.isValid(value);

  const removeFF = (value) => {
    if (R.type(value) === 'Array') {
      const newValue = value.filter((item) => !isUndefined(item));
      return newValue.map(removeFF);
    }

    if (R.type(value) === 'Object') {
      return Object.keys(value).reduce((acc, key) => {
        if (['Object', 'Array'].includes(R.type(value[key])) && notObjectId(value[key])) {
          return { ...acc, [key]: removeFF(value[key]) };
        }

        return isUndefined(value[key]) ? acc : { ...acc, [key]: value[key] };
      }, {});
    }

    return value;
  };

  const newData = removeFF(data);

  return newData;
};

export const getAggregationPath = (data: string): object[] => {
  const levels = data.split('.');

  const stages = levels.reduce((acc, level) => {
    const [field, value] = level.split(':');
    const stage = [];

    if (field && value) {
      const key = field === 'id' ? '_id' : field;
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

export const getUpdatePath = (
  type: 'create' | 'update' | 'remove',
  path: string,
  data?: any
): [data: object, options: object] => {
  const vars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  const TYPES = {
    create: '$push',
    update: '$set',
    remove: '$pull',
  };

  const levels = path.split('.');

  const result = levels.reduce(
    (acc, level) => {
      const [field, value] = level.split(':');

      const newFilter = [];
      const newMap = [];
      let newData = acc.data;

      const isLastToRemove = type === 'remove' && acc.map.length === levels.length - 1;

      if (field && !value) {
        newMap.push(field);
      }

      if (field && value && !isLastToRemove) {
        const key = field === 'id' ? '_id' : field;
        const letter = vars[acc.filter.length];

        newMap.push(`$[${letter}]`);
        newFilter.push({ [`${letter}.${key}`]: objectid(value) });
      }

      if (isLastToRemove) {
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
