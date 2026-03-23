# Static Hosting

The API Gateway can serve plain static assets for app UIs.

This is designed for simple HTML/CSS/JS sites with no build step.

## Config

In `platform.config.js`:

```js
export default {
  apps: {
    'example-app': {
      functionsDir: '.../apps/example-app/functions',
      staticDir: '.../apps/example-app/static',
      staticPrefix: '/app/'
    }
  },
  routes: [...]
};
```

- `apps.<app>.staticDir`: folder containing static files for that app
- `apps.<app>.staticPrefix`: URL prefix where that app is served

## Example

Current example app serves:

- page: `/app/`
- script: `/app/app.js`
- stylesheet: `/app/styles.css`

The included page calls gateway route `GET /hello` using `fetch('/hello')`.

## Notes

- Keep static assets public-safe (never include secrets).
- For now, only plain HTML/CSS/JS is expected.
- API routes continue to be declared in `platform.config.js` under `routes`, with `app` set per route.
