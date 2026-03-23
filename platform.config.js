import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  // Directory containing handler files for this app.
  // Path is relative to the project root.
  functionsDir: path.resolve(__dirname, './apps/example-app/functions'),

  routes: [
    {
      path: '/hello',
      method: 'GET',
      function: 'hello',
      auth: false,
    },
    {
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
