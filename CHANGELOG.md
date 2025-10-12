# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2025-10-11

### 🔧 Fixed
- **TypeScript Import Issues**: Fixed `createSuperModel` being treated as type instead of value
- Improved export declarations to properly export function values
- Enhanced TypeScript compatibility with newer Mongoose versions
- Added support for Mongoose 8.x in peer dependencies

### 📦 Enhanced
- Better TypeScript declaration generation for function exports
- Improved module resolution for both CommonJS and ES modules
- More robust UpdateResult interface for Mongoose compatibility

### ✅ Verified Compatibility
- ✅ Mongoose 5.x, 6.x, 7.x, and 8.x support
- ✅ TypeScript strict mode compatibility
- ✅ Both named and default imports working correctly

## [2.1.2] - 2025-10-11

### 🔧 Fixed
- **Import Issues**: Resolved module resolution problems
- Removed circular import references causing runtime errors
- Fixed `module.d` reference causing "Cannot find module" errors
- Improved TypeScript declaration generation

### 📦 Enhanced
- Added comprehensive `exports` field in package.json for better ESM support
- Improved module resolution compatibility with different bundlers
- Better TypeScript type export organization

### ✅ Verified Import Support
- ✅ `import SuperModelMongo from '@ederzadravec/super-model-mongo'`
- ✅ `import { createSuperModel } from '@ederzadravec/super-model-mongo'`
- ✅ `import SuperModelMongo, { ServiceInstance } from '@ederzadravec/super-model-mongo'`

## [2.1.1] - 2025-10-11

### 🚀 Improved
- **Default Import Support**: Now supports `import SuperModelMongo from '@ederzadravec/super-model-mongo'`
- Updated package.json main entry point to use `dist/index.js`
- Enhanced index.ts with proper default export
- Updated examples and documentation to show preferred import syntax

### 🔧 Technical
- Fixed package entry points for better ES module compatibility
- Maintained backward compatibility with named imports
- Updated README with comprehensive import examples

## [2.1.0] - 2025-10-11

### 🚀 Added
- **Unlimited Nesting Depth**: Replaced fixed 10-level limit with dynamic variable name generation
- Support for unlimited nested path operations (previously limited to 10 levels)
- Dynamic array filter variable generation (a, b, c... z, aa, ab, ac...)

### 🔧 Improved
- **Type Safety**: Eliminated all `any` types throughout the codebase
- Enhanced TypeScript strict mode compliance
- Better error handling with proper type assertions

### 🧪 Testing
- Added comprehensive tests for deep nesting scenarios (15+ levels)
- Improved test coverage for variable name generation
- Better validation of MongoDB array filter operations

### 🐛 Fixed
- Resolved TypeScript compilation errors with strict typing
- Fixed import issues in model.ts file
- Improved aggregation result type handling

## [2.0.0] - 2025-10-11

### 🚨 BREAKING CHANGES
- **API Simplification**: Removed the `req` parameter from all methods
- Pagination and query options are now passed directly as method parameters
- This makes the API cleaner and removes the coupling with web framework request objects

### Changed
- `findOne(query, ...props)` - no longer requires `req` parameter
- `findAll(query, options)` - pagination options (`limit`, `page`) now passed in `options` object
- `create(data)` - simplified to only require data parameter
- `update(query, data)` - removed `req` parameter
- `remove(query)` - removed `req` parameter
- `hasAny(fields, exclude)` - removed `req` parameter
- `findOnePath(query, path)` - removed `req` parameter
- `findAllPath(query, path, options)` - pagination options now in `options` object
- `createPath(query, path, data)` - removed `req` parameter
- `updatePath(query, path, data)` - removed `req` parameter
- `removePath(query, path)` - removed `req` parameter

### Added
- New `PaginationOptions` interface for cleaner pagination handling
- Better TypeScript support with more specific option types
- More intuitive API that doesn't depend on web framework specifics

### Migration Guide

**Before (v1.x):**
```typescript
// Old API requiring req parameter
const users = await userService.findAll(
  { query: { limit: '10', page: '1' } },
  { active: true },
  { sort: { name: 1 } }
);

await userService.createPath(
  {},
  { _id: userId },
  'items',
  itemData
);
```

**After (v2.x):**
```typescript
// New simplified API
const users = await userService.findAll(
  { active: true },
  { 
    limit: 10, 
    page: 1, 
    sort: { name: 1 } 
  }
);

await userService.createPath(
  { _id: userId },
  'items',
  itemData
);
```

## [1.1.0] - 2025-10-11

### Added
- Enhanced TypeScript support with better type definitions
- Comprehensive error handling and validation
- Input sanitization and validation for all operations
- Better documentation with README and examples
- Jest testing setup with basic test coverage
- Path validation for nested operations
- Support for complex nested document operations

### Changed
- Improved error messages with more descriptive text
- Enhanced pagination with proper bounds checking
- Updated TypeScript configuration for better compatibility
- Moved TypeScript to devDependencies and added as peer dependency
- Better handling of edge cases in data operations

### Fixed
- Fixed undefined value removal in nested objects
- Improved ObjectId validation throughout the library
- Better error handling in async operations
- Fixed aggregation pipeline generation for complex paths

## [1.0.0] - Initial Release

### Added
- Basic CRUD operations for MongoDB documents
- Support for nested document operations via path syntax
- Aggregation-based pagination
- Data sanitization utilities
- TypeScript definitions
- Mongoose integration