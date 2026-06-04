import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createSuperModel from '../src/model';

jest.setTimeout(60000);

describe('model (integration)', () => {
  let mongod: MongoMemoryServer;
  let User: mongoose.Model<any>;
  let Board: mongoose.Model<any>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
    await mongoose.connect(mongod.getUri(), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    User = mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
    Board = mongoose.model(
      'Board',
      new mongoose.Schema({
        title: String,
        cards: [new mongoose.Schema({ title: String, done: Boolean })],
      })
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Board.deleteMany({});
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the matching document', async () => {
      await User.create({ name: 'Alice', email: 'alice@test.com' });
      const svc = createSuperModel(User);
      const result = await svc.findOne({ name: 'Alice' });
      expect(result).toMatchObject({ name: 'Alice', email: 'alice@test.com' });
    });

    it('returns null when not found', async () => {
      const svc = createSuperModel(User);
      expect(await svc.findOne({ name: 'Nobody' })).toBeNull();
    });

    it('calls populate with the document', async () => {
      await User.create({ name: 'Bob' });
      const populate = jest.fn(async (doc: any) => doc);
      const svc = createSuperModel(User, { populate });
      await svc.findOne({ name: 'Bob' });
      expect(populate).toHaveBeenCalledTimes(1);
      expect(populate.mock.calls[0][0]).toMatchObject({ name: 'Bob' });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persists and returns the new document', async () => {
      const svc = createSuperModel(User);
      const result = await svc.create({ name: 'Carol', email: 'carol@test.com' });
      expect(result).toMatchObject({ name: 'Carol' });
      expect(await User.countDocuments({ name: 'Carol' })).toBe(1);
    });

    it('strips undefined fields before saving', async () => {
      const svc = createSuperModel(User);
      const result = await svc.create({ name: 'Dan', email: undefined });
      expect((result as any).email).toBeUndefined();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates the matching document', async () => {
      const doc = await User.create({ name: 'Eve', email: 'eve@test.com' });
      const svc = createSuperModel(User);
      const res = await svc.update({ _id: doc._id }, { $set: { name: 'Eva' } });
      expect(res.modifiedCount ?? (res as any).nModified).toBe(1);
      expect(await User.findById(doc._id)).toMatchObject({ name: 'Eva' });
    });

    it('returns 0 modified when query matches nothing', async () => {
      const svc = createSuperModel(User);
      const res = await svc.update({ name: 'ghost' }, { $set: { name: 'x' } });
      expect(res.modifiedCount ?? (res as any).nModified).toBe(0);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes all matching documents', async () => {
      await User.create([{ name: 'X' }, { name: 'X' }, { name: 'Y' }]);
      const svc = createSuperModel(User);
      await svc.remove({ name: 'X' });
      expect(await User.countDocuments({ name: 'X' })).toBe(0);
      expect(await User.countDocuments({ name: 'Y' })).toBe(1);
    });
  });

  // ─── hasAny ───────────────────────────────────────────────────────────────

  describe('hasAny', () => {
    it('returns the field names that are already taken', async () => {
      await User.create({ name: 'Frank', email: 'frank@test.com' });
      const svc = createSuperModel(User);
      expect(await svc.hasAny({ email: 'frank@test.com' })).toContain('email');
    });

    it('returns [] when nothing matches', async () => {
      const svc = createSuperModel(User);
      expect(await svc.hasAny({ email: 'nobody@test.com' })).toEqual([]);
    });

    it('excludes the given id from the uniqueness check', async () => {
      const doc = await User.create({ name: 'Grace', email: 'grace@test.com' });
      const svc = createSuperModel(User);
      expect(await svc.hasAny({ email: 'grace@test.com' }, String(doc._id))).toEqual([]);
    });

    it('returns [] for empty or missing fields', async () => {
      const svc = createSuperModel(User);
      expect(await svc.hasAny({})).toEqual([]);
      expect(await svc.hasAny(undefined)).toEqual([]);
    });
  });

  // ─── aggregate ────────────────────────────────────────────────────────────

  describe('aggregate', () => {
    it('executes an arbitrary pipeline', async () => {
      await User.create([{ name: 'A' }, { name: 'B' }]);
      const svc = createSuperModel(User);
      const result = await svc.aggregate([{ $count: 'total' }]) as Array<{ total: number }>;
      expect(result[0].total).toBe(2);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns data, total, page and limit', async () => {
      await User.create([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
      const svc = createSuperModel(User);
      const res = await svc.findAll({}, { limit: 2, page: 1 });
      expect(res.data).toHaveLength(2);
      expect(res.total).toBe(3);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(2);
    });

    it('applies project inside the facet — not to the wrapper', async () => {
      await User.create({ name: 'H', email: 'h@test.com' });
      const svc = createSuperModel(User);
      const res = await svc.findAll({}, { project: { name: 1 } });
      expect(res.data[0]).toHaveProperty('name');
      expect(res.data[0]).not.toHaveProperty('email');
    });

    it('passes the data array (not the facet wrapper) to populate', async () => {
      await User.create([{ name: 'I' }, { name: 'J' }]);
      const populate = jest.fn(async (docs: any) => docs);
      const svc = createSuperModel(User, { populate });
      await svc.findAll({});
      expect(Array.isArray(populate.mock.calls[0][0])).toBe(true);
    });
  });

  // ─── findOnePath ──────────────────────────────────────────────────────────

  describe('findOnePath', () => {
    it('returns the subdocument matching the path filter', async () => {
      const board = await Board.create({
        title: 'B',
        cards: [{ title: 'Card1', done: false }, { title: 'Card2', done: true }],
      });
      const svc = createSuperModel(Board);
      const card = await svc.findOnePath<any>({ _id: board._id }, 'cards.title:Card2');
      expect(card).toMatchObject({ title: 'Card2', done: true });
    });

    it('returns null when no subdocument matches the filter', async () => {
      const board = await Board.create({ title: 'B', cards: [{ title: 'Card1' }] });
      const svc = createSuperModel(Board);
      const result = await svc.findOnePath({ _id: board._id }, 'cards.title:ghost');
      expect(result).toBeNull();
    });

    it('calls populate with the matched subdocument', async () => {
      const board = await Board.create({ title: 'B', cards: [{ title: 'C1' }, { title: 'C2' }] });
      const populate = jest.fn(async (doc: any) => doc);
      const svc = createSuperModel(Board, { populate });
      await svc.findOnePath({ _id: board._id }, 'cards.title:C1');
      expect(populate).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createPath ───────────────────────────────────────────────────────────

  describe('createPath', () => {
    it('pushes a new subdocument into the nested array', async () => {
      const board = await Board.create({ title: 'B', cards: [] });
      const svc = createSuperModel(Board);
      await svc.createPath({ _id: board._id }, 'cards', { title: 'NewCard', done: false });
      const updated = await Board.findById(board._id);
      expect(updated?.cards).toHaveLength(1);
      expect(updated?.cards[0].title).toBe('NewCard');
    });
  });

  // ─── updatePath ───────────────────────────────────────────────────────────

  describe('updatePath', () => {
    it('updates a specific field inside a nested subdocument', async () => {
      const board = await Board.create({ title: 'B', cards: [{ title: 'Old', done: false }] });
      const cardId = (board.cards[0] as any)._id;
      const svc = createSuperModel(Board);
      // path points to the subdoc — $set replaces the whole element
      await svc.updatePath({ _id: board._id }, `cards.id:${cardId}`, { title: 'Updated' });
      const updated = await Board.findById(board._id);
      expect(updated?.cards[0].title).toBe('Updated');
    });
  });

  // ─── removePath ───────────────────────────────────────────────────────────

  describe('removePath', () => {
    it('removes a subdocument from the nested array by id', async () => {
      const board = await Board.create({
        title: 'B',
        cards: [{ title: 'ToRemove', done: false }, { title: 'Keep', done: false }],
      });
      const cardId = (board.cards[0] as any)._id;
      const svc = createSuperModel(Board);
      await svc.removePath({ _id: board._id }, `cards.id:${cardId}`);
      const updated = await Board.findById(board._id);
      expect(updated?.cards).toHaveLength(1);
      expect(updated?.cards[0].title).toBe('Keep');
    });
  });

  // ─── findAllPath ──────────────────────────────────────────────────────────

  describe('findAllPath', () => {
    it('returns paginated subdocuments with total', async () => {
      const board = await Board.create({
        title: 'B',
        cards: [{ title: 'C1' }, { title: 'C2' }, { title: 'C3' }],
      });
      const svc = createSuperModel(Board);
      const res = await svc.findAllPath<any>({ _id: board._id }, 'cards', { limit: 2 });
      expect(res.data).toHaveLength(2);
      expect(res.total).toBe(3);
    });

    it('applies project to subdocuments', async () => {
      const board = await Board.create({ title: 'B', cards: [{ title: 'C1', done: false }] });
      const svc = createSuperModel(Board);
      const res = await svc.findAllPath<any>({ _id: board._id }, 'cards', { project: { title: 1 } });
      expect(res.data[0]).toHaveProperty('title');
      expect(res.data[0]).not.toHaveProperty('done');
    });

    it('passes the data array (not the facet wrapper) to populate', async () => {
      const board = await Board.create({ title: 'B', cards: [{ title: 'C1' }] });
      const populate = jest.fn(async (docs: any) => docs);
      const svc = createSuperModel(Board, { populate });
      await svc.findAllPath({ _id: board._id }, 'cards');
      expect(Array.isArray(populate.mock.calls[0][0])).toBe(true);
    });
  });
});
