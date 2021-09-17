# Roadmap

OK - fork `koa-shopify-auth` and add in `node_modules/@shopify/koa-shopify-auth/dist/src/auth/index.js`:
```
return function shopifyAuth(ctx, next) {
  return tslib_1.__awaiter(this, void 0, void 0, function () {
    var shop, redirectUrl, _a, e_1;
    if (ctx.state['accessMode']) {
      // console.log('je passe en accessMode', ctx.state['accessMode']);
      config.accessMode = ctx.state['accessMode']
    }
```
OK - How to rebase efficiently this fork with the original one => Too much changes in this starter. I'll watch the original repo regularly...
- Make this starter easier to maintain across the apps to come ?
  - => we create packages for the main components:
    - shopifyAPI
    - dynamoDB + sessionStorage
    - prepareAuthSession
    - forceOnlineMode
    - mail
    - s3

OK - How to use only serverless functions on AWS ?
OK - Implement the online access
- protect all routes behind authent: Manage all these auth scenarios
  - app as Shopify proxy: We call a function from the front. ie. we check the gift card as in Izac
  - app call with a query string including the encrypted token (myeditor)
  - regular login from a shopify app: in the iframe through react
  - CRON
  - Private app: TBD

  => some functions can only check if the call is from shopify store
  => some may check if the call is from shopify store + decrypt the token in the querystring
  => some rely on the default auth mechanism
  => some may bypass the auth with the offline token if called internally in the app (CRON)
- refactor Shopify API with the shopify-api REST and GRAPHQL helpers
- Create Shopify micro-services:
  - Email with liquid templates
  - S3 middleware

# Priority
