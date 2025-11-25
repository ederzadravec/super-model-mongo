# Super Model Mongo

[Versão em Português](README.md)

A service layer for Mongoose that simplifies nested queries, pagination, and complex subdocument updates.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Import](#quick-import)
- [Quick Example](#quick-example)
- [Creating the Service Instance](#creating-the-service-instance)
- [ServiceInstance API](#serviceinstance-api)
  - [Basic Operations](#basic-operations)
  - [Utilities](#utilities)
  - [Path Operations](#path-operations)
- [Path Syntax](#path-syntax)
- [Utility Functions](#utility-functions)
- [End-to-End Examples](#end-to-end-examples)
- [TypeScript Support](#typescript-support)
- [License](#license)

## Overview

Super Model Mongo wraps a Mongoose `Model` and provides a consistent interface for working with MongoDB collections, especially when nested arrays or documents require custom pagination.

## Key Features

- CRUD operations with automatic data sanitisation.
- Aggregation-based pagination with metadata (`total`, `limit`, `page`).
- Declarative nested path helpers (`items.id:<ObjectId>.tags`).
- Optional `populate`/post-processing hook for every response that returns data.
- Reusable helpers for aggregation pipelines and nested updates.
- Complete TypeScript definitions for intellisense and type safety.

## Installation

```bash
 

npm install @ederzadravec/super-model-mongo
# or
yarn add @ederzadravec/super-model-mongo
```bash
npm install @ederzadravec/super-model-mongo
 

```typescript
// Default import (recommended)
import SuperModelMongo from '@ederzadravec/super-model-mongo';

```typescript

// Import with types
import SuperModelMongo, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';
```

## Quick Example

 

```typescript
import mongoose from 'mongoose';
import SuperModelMongo from '@ederzadravec/super-model-mongo';

const UserModel = mongoose.model('User', userSchema);

const userService = SuperModelMongo(UserModel);

const users = await userService.findAll(
  { name: { $regex: 'john', $options: 'i' } },
  { limit: 10, page: 1, sort: { name: 1 } }
);
```

## Creating the Service Instance

 

```typescript
const userService = SuperModelMongo(UserModel, {
  populate: async (result) => {
    // Runs on every response that returns data
    return result;
  },
});
```

- `model`: required `mongoose.Model` instance.
- `defaultOptions.populate`: optional async hook to enrich or transform results.
- Returns: a `ServiceInstance<T>` exposing the methods described below.

## ServiceInstance API

### Basic Operations

#### `findOne(query?, projection?, options?)`

Finds the first document that matches `query`. `projection` and `options` are passed directly to `model.findOne`. If `populate` is defined it runs before returning the document.

> Returns: `Promise<T | null>`

```typescript
const user = await userService.findOne({ email: 'admin@example.com' }, { password: 0 });
```

**Example response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "admin",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### `findAll(query?, options?)`

Runs an aggregation pipeline that applies pagination, sorting, and projection. `limit` is clamped between 1 and 100. The response always contains `data`, `total`, `page`, and `limit`.

> Returns: `Promise<FindAllResponse<T>>`

```typescript
const { data, total, page } = await userService.findAll(
  { active: true },
  { limit: 20, page: 2, sort: { createdAt: -1 }, project: { password: 0 } }
);
```

**Example response:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Smith",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Mary Jones",
      "active": true,
      "createdAt": "2024-01-14T08:20:00.000Z"
    }
  ],
  "total": 45,
  "page": 2,
  "limit": 20
}
```

#### `create(data?)`

Removes `undefined` fields with `removeUndefined` before persisting the document. Handy for payloads coming from forms or APIs with optional fields.

> Returns: `Promise<T>`

```typescript
const newUser = await userService.create({ name: 'Sofia', role: undefined, metadata: { age: 30 } });
```

**Example response:**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Sofia",
  "metadata": {
    "age": 30
  },
  "createdAt": "2024-01-20T14:25:00.000Z",
  "__v": 0
}
```

#### `update(query?, data?)`

Executes `model.updateOne` with the supplied filter. The payload is automatically cleaned to drop `undefined` keys.

> Returns: `Query<UpdateResult, T>`

```typescript
const result = await userService.update({ _id: userId }, { lastLogin: new Date() });
```

**Example response:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `remove(query?)`

Calls `model.remove` and exposes the raw MongoDB result.

> Returns: `Query<UpdateResult, T>`

```typescript
const result = await userService.remove({ email: 'temp@example.com' });
```

**Example response:**

```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```

### Utilities

#### `aggregate(pipeline)`

Direct proxy to `model.aggregate` for custom scenarios.

> Returns: `Aggregate<unknown[]>`

```typescript
const stats = await userService.aggregate([
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
]);
```

**Example response:**

```json
[
  { "_id": "admin", "count": 5 },
  { "_id": "user", "count": 38 },
  { "_id": "manager", "count": 2 }
]
```

#### `hasAny(fields?, exclude?)`

Checks for field collisions using `$or`. `exclude` accepts a string `_id` to ignore the current document.

> Returns: `Promise<string[]>`

```typescript
const conflicts = await userService.hasAny(
  { email: 'john@example.com', username: 'johnny' },
  '653cfa2c10ed3f00f1c15e5b'
);
if (conflicts.length) {
  throw new Error(`Fields already used: ${conflicts.join(', ')}`);
}
```

**Example response:**

```json
["email"]
```

### Path Operations

These helpers work with subdocuments identified through a path string (see Path Syntax).

#### `findOnePath(query?, path)`

Returns the first subdocument found.

> Returns: `Promise<R | null>`

```typescript
const item = await userService.findOnePath({ _id: userId }, 'items.id:item1');
```

**Example response:**

```json
{
  "_id": "507f1f77bcf86cd799439020",
  "name": "Item 1",
  "price": 99.90,
  "tags": ["electronics", "sale"]
}
```

#### `findAllPath(query?, path, options?)`

Paginates items inside nested arrays using the same strategy as `findAll`.

> Returns: `Promise<FindAllResponse<R>>`

```typescript
const purchases = await userService.findAllPath(
  { _id: userId },
  'purchases',
  { limit: 5, page: 2, sort: { createdAt: -1 } }
);
```

**Example response:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439030",
      "product": "Laptop",
      "amount": 2500.00,
      "createdAt": "2024-01-18T16:45:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439031",
      "product": "Mouse",
      "amount": 50.00,
      "createdAt": "2024-01-17T10:30:00.000Z"
    }
  ],
  "total": 12,
  "page": 2,
  "limit": 5
}
```

#### `createPath(query?, path, data)`

Adds a new element to a nested array with `$push`.

> Returns: `Promise<UpdateResult>`

```typescript
const result = await userService.createPath({ _id: userId }, 'items', { name: 'New item', price: 15 });
```

**Example response:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `updatePath(query?, path, data)`

Updates a nested subdocument using `$set` with automatically generated `arrayFilters`.

> Returns: `Promise<UpdateResult>`

```typescript
const result = await userService.updatePath({ _id: userId }, 'items.id:item1', { name: 'Updated Item' });
```

**Example response:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

#### `removePath(query?, path)`

Removes the matching subdocument using `$pull`.

> Returns: `Promise<UpdateResult>`

```typescript
const result = await userService.removePath({ _id: userId }, 'items.id:item1');
```

**Example response:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```

## Path Syntax

Paths use dot notation. Adding `id:<ObjectId>` filters array elements by `_id`.

```typescript
'items'                             // Top-level array
'items.id:60f1b2b3c4a5d6e7f8f9a0b'   // Specific element
'items.id:... .tags.id:...'          // Nested subdocument
```

Each segment is validated as an ObjectId when required, generating `$match`/`$unwind` stages for aggregation and `arrayFilters` for updates.

## Utility Functions

- `removeUndefined(data)`: recursively cleans objects/arrays while leaving `ObjectId` values intact.
- `getAggregationPath(path)`: converts the path string into aggregation stages (`$match`, `$unwind`, `$replaceRoot`).
- `getUpdatePath(type, path, data?)`: builds the `$push`/`$set`/`$pull` update plus the corresponding `arrayFilters`.

## End-to-End Examples

### Paginating post comments

```typescript
const comments = await postService.findAllPath(
  { _id: postId },
  'comments',
  { limit: 10, page: 3, sort: { createdAt: -1 } }
);
```

**Example response:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439040",
      "author": "Mary Smith",
      "text": "Excellent post!",
      "createdAt": "2024-01-19T15:20:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439041",
      "author": "John Doe",
      "text": "Very helpful, thanks!",
      "createdAt": "2024-01-19T14:10:00.000Z"
    }
  ],
  "total": 47,
  "page": 3,
  "limit": 10
}
```
```

### Updating a specific user address

```typescript
const result = await userService.updatePath(
  { _id: userId },
  'addresses.id:64f1c2d3e4f5a6b7c8d9e0f1',
  { label: 'Primary', city: 'São Paulo' }
);
```

**Example response:**

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1,
  "upsertedCount": 0,
  "upsertedId": null
}
```
```

## TypeScript Support

```typescript
import superModel, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';

// Simple interface with your business fields
interface User {
  name: string;
  email: string;
  active: boolean;
}

// Create your Mongoose model as usual
const UserModel = mongoose.model<User>('User', userSchema);

// Specify the type only once in the generic
const service: ServiceInstance<User> = superModel<User>(UserModel);

// All methods return the correct type
const user: User | null = await service.findOne({ email: 'user@example.com' });
const result: FindAllResponse<User> = await service.findAll();
const newUser: User = await service.create({ name: 'John', email: 'john@example.com', active: true });
```

**Key benefits:**
- No need to extend `Document` or use complex types
- Just specify your interface once: `superModel<User>(UserModel)`
- All methods automatically return the correct type
- Works with simple interfaces or interfaces that extend custom types

## License

MIT
