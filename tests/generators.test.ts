import { removeUndefined, getAggregationPath, getUpdatePath } from '../src/generators';

describe('Generators', () => {
  describe('removeUndefined', () => {
    it('should remove undefined values from object', () => {
      const input = {
        name: 'John',
        age: undefined,
        city: 'New York',
        nested: {
          value: 'test',
          undefined: undefined
        }
      };

      const expected = {
        name: 'John',
        city: 'New York',
        nested: {
          value: 'test'
        }
      };

      expect(removeUndefined(input)).toEqual(expected);
    });

    it('should handle arrays with undefined values', () => {
      const input = ['a', undefined, 'b', 'c'];
      const expected = ['a', 'b', 'c'];

      expect(removeUndefined(input as any)).toEqual(expected);
    });

    it('should return original data if null or undefined', () => {
      expect(removeUndefined(null as any)).toBeNull();
      expect(removeUndefined(undefined as any)).toBeUndefined();
    });
  });

  describe('getAggregationPath', () => {
    it('should generate correct aggregation for simple path', () => {
      const result = getAggregationPath('items');
      
      expect(result).toEqual([
        { $unwind: '$items' },
        { $replaceRoot: { newRoot: '$items' } }
      ]);
    });

    it('should throw error for invalid path', () => {
      expect(() => getAggregationPath('')).toThrow('Path must be a non-empty string');
      expect(() => getAggregationPath(null as any)).toThrow('Path must be a non-empty string');
    });

    it('should throw error for invalid path segment', () => {
      expect(() => getAggregationPath('.')).toThrow('Invalid path segment');
    });
  });

  describe('getUpdatePath', () => {
    it('should generate correct update for create operation', () => {
      const [updateQuery, options] = getUpdatePath('create', 'items', { name: 'test' });
      
      expect(updateQuery).toEqual({
        $push: {
          items: { name: 'test' }
        }
      });
      expect(options).toEqual({ arrayFilters: [] });
    });

    it('should support deep nesting beyond 10 levels', () => {
      // Create a path with more than 10 nested levels to test unlimited depth
      const deepPath = 'level1.id:507f1f77bcf86cd799439011.level2.id:507f1f77bcf86cd799439012.level3.id:507f1f77bcf86cd799439013.level4.id:507f1f77bcf86cd799439014.level5.id:507f1f77bcf86cd799439015.level6.id:507f1f77bcf86cd799439016.level7.id:507f1f77bcf86cd799439017.level8.id:507f1f77bcf86cd799439018.level9.id:507f1f77bcf86cd799439019.level10.id:507f1f77bcf86cd79943901a.level11.id:507f1f77bcf86cd79943901b.finalField';
      
      const [updateQuery, options] = getUpdatePath('update', deepPath, { value: 'deep test' });
      
      // Should generate variable names: a, b, c, d, e, f, g, h, i, j, k, l
      expect((options.arrayFilters as Array<Record<string, unknown>>)).toHaveLength(11);
      
      // Check that it generates proper variable names beyond single letters
      const expectedArrayFilters = [
        { 'a._id': expect.any(Object) },
        { 'b._id': expect.any(Object) },
        { 'c._id': expect.any(Object) },
        { 'd._id': expect.any(Object) },
        { 'e._id': expect.any(Object) },
        { 'f._id': expect.any(Object) },
        { 'g._id': expect.any(Object) },
        { 'h._id': expect.any(Object) },
        { 'i._id': expect.any(Object) },
        { 'j._id': expect.any(Object) },
        { 'k._id': expect.any(Object) }
      ];
      
      expect((options.arrayFilters as Array<Record<string, unknown>>)).toEqual(expectedArrayFilters);
      
      // Verify the update path uses the correct variable names
      expect(updateQuery).toEqual({
        $set: {
          'level1.$[a].level2.$[b].level3.$[c].level4.$[d].level5.$[e].level6.$[f].level7.$[g].level8.$[h].level9.$[i].level10.$[j].level11.$[k].finalField': { value: 'deep test' }
        }
      });
    });

    it('should generate sequential variable names correctly', () => {
      // Test the internal variable name generation logic indirectly
      const path1 = 'level1.id:507f1f77bcf86cd799439011.field1';
      const path2 = 'level1.id:507f1f77bcf86cd799439011.level2.id:507f1f77bcf86cd799439012.field2';
      
      const [, options1] = getUpdatePath('update', path1, { value: 'test1' });
      const [, options2] = getUpdatePath('update', path2, { value: 'test2' });
      
      expect((options1.arrayFilters as Array<Record<string, unknown>>)).toHaveLength(1);
      expect((options2.arrayFilters as Array<Record<string, unknown>>)).toHaveLength(2);
      
      // Check the structure of the filters
      const arrayFilters1 = options1.arrayFilters as Array<Record<string, unknown>>;
      const arrayFilters2 = options2.arrayFilters as Array<Record<string, unknown>>;
      
      expect(Object.keys(arrayFilters1[0])[0]).toBe('a._id');
      expect(Object.keys(arrayFilters2[0])[0]).toBe('a._id');
      expect(Object.keys(arrayFilters2[1])[0]).toBe('b._id');
    });

    it('should handle extreme nesting with 15 levels', () => {
      // Test with 15 levels to demonstrate unlimited depth capability
      // Using valid ObjectIds (24 character hex strings)
      const levels = Array.from({ length: 15 }, (_, i) => {
        const id = `507f1f77bcf86cd79943${i.toString().padStart(4, '0')}`;
        return `level${i + 1}.id:${id}`;
      });
      const extremePath = levels.join('.') + '.finalField';
      
      const [updateQuery, options] = getUpdatePath('update', extremePath, { value: 'extreme test' });
      
      // Should generate 15 array filters
      expect((options.arrayFilters as Array<Record<string, unknown>>)).toHaveLength(15);
      
      // Verify variable name generation for some key positions
      const arrayFilters = options.arrayFilters as Array<Record<string, unknown>>;
      expect(Object.keys(arrayFilters[0])[0]).toBe('a._id');
      expect(Object.keys(arrayFilters[14])[0]).toBe('o._id'); // 15th element (index 14)
      
      // Test that we can handle more than the original 10 variable limit
      expect(arrayFilters.length).toBeGreaterThan(10);
    });

    it('should throw error for invalid operation type', () => {
      expect(() => getUpdatePath('invalid' as any, 'items', {})).toThrow('Type must be one of: create, update, remove');
    });

    it('should throw error for empty path', () => {
      expect(() => getUpdatePath('create', '', {})).toThrow('Path must be a non-empty string');
    });

    it('should throw error for invalid path segment', () => {
      expect(() => getUpdatePath('create', '.invalid', {})).toThrow('Invalid path segment');
    });
  });
});