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
    login: {
      functionsDir: path.resolve(__dirname, './apps/login/functions'),
      staticDir: path.resolve(__dirname, './apps/login/static'),
      staticPrefix: '/login/',
    },
    cranked: {
      functionsDir: path.resolve(__dirname, './apps/cranked/functions'),
      staticDir: path.resolve(__dirname, './apps/cranked/static'),
      staticPrefix: '/cranked/',
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
    {
      app: 'example-app',
      path: '/notes',
      method: 'GET',
      function: 'list-notes',
      auth: true,
      roles: ['admin', 'user'],
    },
    {
      app: 'example-app',
      path: '/notes',
      method: 'POST',
      function: 'put-note',
      auth: true,
      roles: ['admin', 'user'],
    },
    {
      app: 'example-app',
      path: '/notes/:id',
      method: 'DELETE',
      function: 'delete-note',
      auth: true,
      roles: ['admin', 'user'],
    },
    {
      app: 'cranked',
      path: '/cranked/enroll',
      method: 'POST',
      function: 'cranked-enroll',
      auth: true,
      roles: ['admin', 'cranked-player'],
    },
    {
      app: 'cranked',
      path: '/cranked/me',
      method: 'GET',
      function: 'cranked-me',
      auth: true,
      roles: ['admin', 'cranked-player'],
    },
    {
      app: 'cranked',
      path: '/cranked/play',
      method: 'POST',
      function: 'cranked-play',
      auth: true,
      roles: ['admin', 'cranked-player'],
    },
    {
      app: 'cranked',
      path: '/cranked/run-day',
      method: 'POST',
      function: 'cranked-run-day',
      auth: true,
      roles: ['admin'],
    },
  ],

  // Phase 2: tables will be declared here
  // DYNAMODB
  // This is the **Database** configuration, and will be used to generate the database schema in Phase 2.
  tables: [
    { name: 'notes' },
    { name: 'cranked_players' },
    { name: 'cranked_plays' },
    { name: 'cranked_runs' },
  ],
};
