/**
 * hello.js — unauthenticated example handler.
 *
 * Route: GET /hello (auth: false)
 */
export async function handler(event, context) {
  context.logger.info('hello handler invoked');

  return {
    statusCode: 200,
    body: {
      message: 'Hello from the platform!',
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
