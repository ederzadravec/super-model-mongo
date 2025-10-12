import superModel from '@ederzadravec/super-model-mongo';

/**
 * Example showing the simplified API without req parameter
 * This demonstrates how much cleaner the API is now
 */

// Mock mongoose model for example
const mockModel = {} as any;
const userService = superModel(mockModel);

export async function apiComparisonExample() {
  const userId = '60f1b2b3c4a5d6e7f8g9h0i1';

  // ✅ NEW API (v2.0.0+) - Clean and simple
  console.log('=== NEW API (v2.0.0+) ===');
  
  // Basic operations
  const users = await userService.findAll(
    { active: true },
    { 
      limit: 20, 
      page: 1, 
      sort: { createdAt: -1 } 
    }
  );

  const user = await userService.findOne({ _id: userId });
  
  const newUser = await userService.create({
    name: 'John Doe',
    email: 'john@example.com'
  });

  // Path operations
  await userService.createPath(
    { _id: userId },
    'items',
    { name: 'New Item', price: 29.99 }
  );

  const userItems = await userService.findAllPath(
    { _id: userId },
    'items',
    { limit: 10, page: 1 }
  );

  await userService.updatePath(
    { _id: userId },
    'items.id:someItemId',
    { name: 'Updated Item' }
  );

  // Utility functions
  const duplicates = await userService.hasAny(
    { email: 'john@example.com' },
    userId
  );

  console.log('Users found:', users.data.length);
  console.log('User items:', userItems.data.length);
}

export async function fastifyIntegrationExample() {
  /**
   * Example of how to integrate with Fastify or other web frameworks
   * Even though we removed req dependency, integration is still simple
   */
  
  // Fastify route handler example
  const fastifyRoute = async (request: any, reply: any) => {
    try {
      // Extract pagination from query params
      const limit = parseInt(request.query.limit) || 10;
      const page = parseInt(request.query.page) || 1;
      const sort = request.query.sort ? JSON.parse(request.query.sort) : { _id: 1 };

      // Use the clean API
      const result = await userService.findAll(
        { active: true },
        { limit, page, sort }
      );

      reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  };

  // Express route handler example
  const expressRoute = async (req: any, res: any) => {
    try {
      const { limit = 10, page = 1, sort = '{"_id": 1}' } = req.query;

      const result = await userService.findAll(
        { active: true },
        { 
          limit: parseInt(limit), 
          page: parseInt(page), 
          sort: JSON.parse(sort) 
        }
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  return { fastifyRoute, expressRoute };
}

export default apiComparisonExample;