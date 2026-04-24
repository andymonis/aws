/**
 * bank-open.js — open a basic bank account for the authenticated user.
 *
 * Route: POST /bank/open (auth: true)
 */
export async function handler(_event, context) {
  const userId = context.user.id;

  const existing = context.db.get('bank_accounts', userId);
  if (existing) {
    return {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          account: existing,
          alreadyOpen: true,
        },
        requestId: context.requestId,
      },
    };
  }

  const account = context.db.put('bank_accounts', {
    id: userId,
    balance: 0,
  });

  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        account,
        alreadyOpen: false,
      },
      requestId: context.requestId,
    },
  };
}
