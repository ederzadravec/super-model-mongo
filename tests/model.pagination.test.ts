import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import createSuperModel from '../src/model';

// Booting an in-memory mongod is slower than a pure unit test.
jest.setTimeout(60000);

describe('pagination (integration, real MongoDB)', () => {
  let mongod: MongoMemoryServer;
  let Widget: mongoose.Model<any>;
  let Bag: mongoose.Model<any>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
    await mongoose.connect(mongod.getUri(), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    // Top-level documents, for findAll.
    Widget = mongoose.model('Widget', new mongoose.Schema({ name: String }));

    // A parent holding an array of subdocuments, for findAllPath.
    Bag = mongoose.model(
      'Bag',
      new mongoose.Schema({ items: [new mongoose.Schema({ name: String })] })
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await Widget.deleteMany({});
    await Bag.deleteMany({});
  });

  describe('findAll', () => {
    it('sorts the whole result set before slicing the page', async () => {
      // Insert deliberately out of natural order: c, a, b.
      await Widget.create([{ name: 'c' }, { name: 'a' }, { name: 'b' }]);
      const service = createSuperModel(Widget);

      const page1 = await service.findAll({}, { sort: { name: 1 }, limit: 2, page: 1 });
      const page2 = await service.findAll({}, { sort: { name: 1 }, limit: 2, page: 2 });

      // The page must come from a globally sorted set, not a sort of an arbitrary slice.
      expect(page1.data.map((d: any) => d.name)).toEqual(['a', 'b']);
      expect(page2.data.map((d: any) => d.name)).toEqual(['c']);
      expect(page1.total).toBe(3);
    });
  });

  describe('findAllPath', () => {
    it('sorts the subdocuments by their own fields before slicing the page', async () => {
      // One parent whose items are out of order: c, a, b.
      const bag = await Bag.create({ items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }] });
      const service = createSuperModel(Bag);

      const page1 = await service.findAllPath<{ name: string }>(
        { _id: bag._id },
        'items',
        { sort: { name: 1 }, limit: 2, page: 1 }
      );
      const page2 = await service.findAllPath<{ name: string }>(
        { _id: bag._id },
        'items',
        { sort: { name: 1 }, limit: 2, page: 2 }
      );

      expect(page1.data.map((d) => d.name)).toEqual(['a', 'b']);
      expect(page2.data.map((d) => d.name)).toEqual(['c']);
      expect(page1.total).toBe(3);
    });
  });
});
