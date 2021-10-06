import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";

// STARTER
import _ from "lodash";
import defaultRouter from "./routes/defaultRouter";
import * as webhooks from "./webhooks";
import cors from "@koa/cors";
import * as db from "./database";
import * as shopifyAPI from "./shopify";
import * as cron from "../app/cron";
import { DynamoSessionStorage } from "./dynamoSessionStorage";
import { validateSignature } from "../utils/validateSignature"
let cacheProvider = require("./cacheProvider");
// we authorize Ajax calls to unverified CERTS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// We reuse the dynamodb connection to speed up connection
process.env.AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1";
// /STARTER

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES ? process.env.SCOPES.split(",") : [],
  HOST_NAME: process.env.HOST ? process.env.HOST.replace(/https:\/\//, "") : "",
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: DynamoSessionStorage,
  // This should be replaced with your preferred storage strategy
  //SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// STARTER
/**
 * If logged in with online token flow, I prepare the Shopify API
 * with the permanent accesstoken.
 * If not logged in but through a Shopify proxy, I prepare also the Shopify API
 * with the permanent accesstoken
 *
 * TODO : Find a way to protect the whole app even from CRON
 * For now, I let anyone enter if there is "shop" in the query...
 * @param {*} ctx
 * @param {*} next
 */
async function prepareAuthSession(ctx, next) {
  const { session, query } = ctx;
  let shop = query["shop"];

  // We have to improve it. The webhook authentication is done with receiveWebhook
  // We should centralize the way we handle the offline token in such a case
  const webhookShop = ctx.get('X-Shopify-Shop-Domain') || ctx.get('x-shopify-shop-domain');
  if (webhookShop != null && webhookShop != '') {
    shop = webhookShop
  }

  if (shop) {
    const offlineSession = await Shopify.Utils.loadOfflineSession(shop)
    if (offlineSession && offlineSession.accessToken) {
      shopifyAPI.setSettings({ shopName: offlineSession.shop, accessToken: offlineSession.accessToken })
    }
  }

  await next();
}

/**
 * The default authent is 'online'
 * + During the first install, I force the offline flow to install the permanent token
 * @param {*} ctx
 * @param {*} next
 */
async function forceOnlineMode(ctx, next) {
  const { query } = ctx;
  const shop = query["shop"];
  ctx.state.accessMode = "online";

  if (
    (ctx.url.includes("/auth/") || ctx.url.endsWith("/auth")) &&
    shop
  ) {
    // const key = { store: "all", sk: `session#id#offline_${shop}` };
    // const item = await db.getItem(key);
    // if (!_.get(item, "Item.session.accessToken")) {
    //   ctx.state.accessMode = "offline";
    // }
    const offlineSession = await Shopify.Utils.loadOfflineSession(shop)
    if (!offlineSession || !offlineSession.accessToken) {
      ctx.state.accessMode = "offline";
    }
  }

  await next();
}

/**
 * "billing": {
 *  "type": "SUBSCRIPTION",
 *  "id": 12345,
 *  "active": true,
 *  "price": 10.00,
 *  "interval": "EVERY_30_DAYS",
 *  "created_at": "",
 *  "trialDays": 0,
 *  "updated_at": ""
 * }
*/
async function checkBilling(shop, host) {
  let returnUrl = `https://${Shopify.Context.HOST_NAME}?host=${host}&shop=${shop}`;
  const key = { store: shop, sk: "settings" };
  let item = await db.getItem(key);

  switch (process.env.BILLING) {
    case 'NONE':
      if (!item || _.isEmpty(item) || _.get(item, 'billing.type') !== "NONE") {
        db.updateSettings(shop, { "billing": { "type": "NONE" } })
      }
      break;
    case 'SUBSCRIPTION':
    case 'SUBSCRIPTION-NO-DEV':
      if (process.env.BILLING === "SUBSCRIPTION-NO-DEV") {
        const shop = shopifyAPI.getShop()
        if (shop.plan_name === "affiliate") {
          if (!item || _.isEmpty(item) || _.get(item, 'billing.type') !== "NONE") {
            db.updateSettings({ "billing": { "type": "NONE" } })
          }
          break;
        }
      }

      if (!item || _.isEmpty(item) || _.get(item, "Item.billing.type") !== "SUBSCRIPTION" || !_.get(item, "Item.billing.active", false)) {
        const subscription = shopifyAPI.createAppSubscription(returnUrl)
        db.updateSettings(shop, {
          "billing": {
            "type": "SUBSCRIPTION",
            "id": subscription.id,
            "active": true,
            "price": 10.00,
            "interval": "EVERY_30_DAYS",
            "created_at": "",
            "trialDays": 0,
            "updated_at": ""
          }
        })
        returnUrl = subscription.confirmationUrl
        break;
      }
    case 'ONE-TIME':
      console.log('ONE-TIME payment');
      break;
  }

  return returnUrl
}

cron.init();
cacheProvider.start(function (err) {
  if (err) console.error(err);
});
// /STARTER

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];

  // STARTER
  server.proxy = true;
  server.use(cors());
  server.use(forceOnlineMode)
  server.use(prepareAuthSession)

  // The DynamoDB table must be created the very first time the server is launched.
  // If it already exists, it continues
  await db.createTable();
  // /STARTER

  // if you receive AppBridgeError: APP::ERROR::INVALID_CONFIG: host must be provided
  // launch the auth on the server ie. http://livingcolor.ngrok.io/auth?shop=shopname.myshopify.com
  server.use(
    createShopifyAuth({
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;

        if (ctx.state.accessMode === "offline") {
          webhooks.create(ctx.hostname, accessToken, shop);
        }

        // Redirect to app with shop parameter upon auth
        //const returnUrl = `https://${Shopify.Context.HOST_NAME}?host=${host}&shop=${shop}`;
        const redirectURL = checkBilling(shop, host)
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.get("/", async (ctx) => {
    const shop = ctx.query.shop;
    // const key = { store: "all", sk: `session#id#offline_${shop}` };
    // const item = await db.getItem(key);
    // if (!_.get(item, "Item.session.accessToken")) {
    const offlineSession = await Shopify.Utils.loadOfflineSession(shop)
    if (!offlineSession || !offlineSession.accessToken) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  // STARTER
  server.use(defaultRouter.routes(), defaultRouter.allowedMethods());
  // /STARTER
  router.get("(.*)", verifyRequest(), async (ctx) => {
    await handleRequest(ctx);
  });

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
