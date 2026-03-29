import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  // LAMBDA/AMPLIFY RUNTIME CONFIG
  // App registry. Each app is isolated to its own folders.
  apps: {
    'example-app': {
      functionsDir: path.resolve(__dirname, './apps/example-app/functions'),
      staticDir: path.resolve(__dirname, './apps/example-app/static'),
      staticPrefix: '/app/',
    },
    auth: {
      functionsDir: path.resolve(__dirname, './apps/auth/functions'),
      staticDir: path.resolve(__dirname, './apps/auth/static'),
      staticPrefix: '/auth/',
    },
  },

  // API_GATEWAY
  // Route declarations. Each route maps to a function handler.
  // This is the **API Gateway** configuration, and will be used to generate the OpenAPI spec in Phase 2.
  routes: [
    {
      app: 'example-app',
      path: '/hello',
      method: 'GET',
      function: 'hello',
      auth: false,
    },
    {
      app: 'example-app',
      path: '/profile',
      method: 'GET',
      function: 'profile',
      auth: true,
      roles: ['admin', 'user'],
    },
  ],

  // Phase 2: tables will be declared here
  // DYNAMODB
  // This is the **Database** configuration, and will be used to generate the database schema in Phase 2.
  tables: [],
};
