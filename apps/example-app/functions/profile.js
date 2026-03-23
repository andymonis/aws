/**
 * profile.js — authenticated example handler.
 *
 * Route: GET /profile (auth: true, roles: [admin, user])
 *
 * Demonstrates reading the injected user from context.
 */
export async function handler(event, context) {
  const { user, requestId } = context;

  return {
    statusCode: 200,
    body: {
      requestId,
      user: {
        id: user.id,
        accountId: user.accountId,
        roles: user.roles,
      },
    },
  };
}
