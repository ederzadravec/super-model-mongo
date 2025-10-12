import mongoose from 'mongoose';
import SuperModelMongo from '@ederzadravec/super-model-mongo';

// Example mongoose schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  items: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: String,
    tags: [String],
    details: {
      description: String,
      price: Number
    }
  }],
  profile: {
    avatar: String,
    bio: String,
    settings: {
      notifications: Boolean,
      theme: String
    }
  }
});

const UserModel = mongoose.model('User', userSchema);

// Create super model instance
const userService = SuperModelMongo(UserModel, {
  populate: async (data) => {
    // Optional populate function - can be async
    if (Array.isArray(data)) {
      return data; // Handle array of documents
    }
    return data; // Handle single document
  }
});

// Example usage
async function examples() {
  // Basic operations - sem necessidade de req
  const users = await userService.findAll(
    { name: { $regex: 'john', $options: 'i' } },
    { 
      limit: 20,
      page: 1,
      sort: { name: 1 } 
    }
  );

  const user = await userService.findOne(
    { email: 'john@example.com' }
  );

  const newUser = await userService.create({
    name: 'John Doe',
    email: 'john@example.com',
    items: []
  });

  // Path operations - working with nested documents
  const userId = newUser._id.toString();

  // Add new item to user's items array
  await userService.createPath(
    { _id: userService.oid(userId) },
    'items',
    {
      name: 'New Item',
      tags: ['important', 'new'],
      details: {
        description: 'A new item',
        price: 29.99
      }
    }
  );

  // Find all items for a user with pagination
  const userItems = await userService.findAllPath(
    { _id: userService.oid(userId) },
    'items',
    { 
      limit: 10,
      page: 1,
      sort: { name: 1 }
    }
  );

  // Update specific item
  const itemId = userItems.data[0]._id.toString();
  await userService.updatePath(
    { _id: userService.oid(userId) },
    `items.id:${itemId}`,
    { name: 'Updated Item Name' }
  );

  // Remove specific item
  await userService.removePath(
    { _id: userService.oid(userId) },
    `items.id:${itemId}`
  );

  // Complex nested path operations
  // Update nested object in specific item
  await userService.updatePath(
    { _id: userService.oid(userId) },
    `items.id:${itemId}.details`,
    { price: 39.99 }
  );

  // Check for duplicate fields
  const duplicateFields = await userService.hasAny(
    { email: 'john@example.com' },
    userId // exclude this user from check
  );

  console.log('Duplicate fields:', duplicateFields);
}

export default examples;