# Super Model Mongo

A powerful MongoDB wrapper that provides enhanced functionality for working with nested documents and complex queries.

## Features

- 🚀 Enhanced CRUD operations with nested document support
- 📄 Automatic pagination with aggregation pipeline
- 🔍 Path-based operations for nested documents
- 🛡️ Built-in data sanitization and validation
- 📊 Aggregation utilities and helpers
- 💾 TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @ederzadravec/super-model-mongo
# or
yarn add @ederzadravec/super-model-mongo
```

## Installation & Import

### Installation
```bash
npm install @ederzadravec/super-model-mongo
# or
yarn add @ederzadravec/super-model-mongo
```

### Import Options
```typescript
// Default import (recommended)
import SuperModelMongo from '@ederzadravec/super-model-mongo';

// Named import
import { createSuperModel } from '@ederzadravec/super-model-mongo';

// Import with types
import SuperModelMongo, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';
```

## Quick Start

```typescript
import mongoose from 'mongoose';
import SuperModelMongo from '@ederzadravec/super-model-mongo';

// Define your mongoose model
const UserModel = mongoose.model('User', userSchema);

// Create super model instance
const userService = SuperModelMongo(UserModel, {
  populate: async (data) => {
    // Optional populate function
    return data;
  }
});

// Use enhanced operations with clean API
const users = await userService.findAll(
  { name: { $regex: 'john', $options: 'i' } },
  { limit: 10, page: 1, sort: { name: 1 } }
);
```

## API Reference

### Basic Operations

#### `findOne(query?, ...props)`

Find a single document.

#### `findAll(query?, options?)`

Find multiple documents with automatic pagination.

```typescript
const users = await userService.findAll(
  { active: true },
  { 
    limit: 20, 
    page: 2, 
    sort: { createdAt: -1 },
    project: { password: 0 }
  }
);
```

#### `create(data?)`

Create a new document.

#### `update(query?, data?)`

Update a document.

#### `remove(query?)`

Remove a document.

### Path Operations (Nested Documents)

#### `findOnePath(query, path)`

Find data at a specific nested path.

#### `findAllPath(query, path, options?)`

Find multiple items at a nested path with pagination.

#### `createPath(query, path, data)`

Add new data to a nested array path.

#### `updatePath(query, path, data)`

Update data at a nested path.

#### `removePath(query, path)`

Remove data from a nested path.

## API Reference

### Basic Operations

#### `findOne(req?, query?, ...props)`
Find a single document.

#### `findAll(req?, query?, options?)`
Find multiple documents with automatic pagination.

#### `create(req?, data?)`
Create a new document.

#### `update(req?, query?, data?)`
Update a document.

#### `remove(req?, query?)`
Remove a document.

### Path Operations (Nested Documents)

#### `findOnePath(req?, query?, path)`
Find data at a specific nested path.

#### `findAllPath(req?, query?, path, options?)`
Find multiple items at a nested path with pagination.

#### `createPath(req?, query?, path, data)`
Add new data to a nested array path.

#### `updatePath(req?, query?, path, data)`
Update data at a nested path.

#### `removePath(req?, query?, path)`
Remove data from a nested path.

### Path Syntax

Paths use dot notation with optional ID selectors:

```typescript
// Access nested array
'items'

// Access specific item by ID
'items.id:60f1b2b3c4a5d6e7f8g9h0i1'

// Access nested field in specific item
'items.id:60f1b2b3c4a5d6e7f8g9h0i1.subItems'
```

## Examples

### Working with Nested Documents

```typescript
// Document structure:
// {
//   _id: "...",
//   name: "User",
//   items: [
//     { _id: "item1", name: "Item 1", tags: ["tag1"] },
//     { _id: "item2", name: "Item 2", tags: ["tag2"] }
//   ]
// }

// Find all items for a user
const items = await userService.findAllPath(
  { _id: userId },
  'items',
  { limit: 10, page: 1 }
);

// Add new item to user's items array
await userService.createPath(
  { _id: userId },
  'items',
  { name: 'New Item', tags: ['new'] }
);

// Update specific item
await userService.updatePath(
  { _id: userId },
  'items.id:item1',
  { name: 'Updated Item' }
);

// Remove specific item
await userService.removePath(
  { _id: userId },
  'items.id:item1'
);
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import superModel, { ServiceInstance, FindAllResponse } from '@ederzadravec/super-model-mongo';

const service: ServiceInstance = superModel(model);
```

## License

MIT
