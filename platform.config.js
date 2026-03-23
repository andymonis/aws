import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  // App registry. Each app is isolated to its own folders.
  apps: {
    'example-app': {
      functionsDir: path.resolve(__dirname, './apps/example-app/functions'),
      staticDir: path.resolve(__dirname, './apps/example-app/static'),
      staticPrefix: '/app/',
    },
  },

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
  tables: [],
};
