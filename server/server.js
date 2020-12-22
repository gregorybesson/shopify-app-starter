import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import _ from "lodash";
import * as handlers from "./handlers/index";
import defaultRouter from "./routes/defaultRouter";
import * as webhooks from "./webhooks";
import cors from "@koa/cors";
import * as db from "./database";
import * as shopify from "./shopify";
import * as cron from "../app/cron";
import { validateSignature } from "../utils/validateSignature";
let cacheProvider = require('./cacheProvider')

// we authorize Ajax calls to unverified CERTS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8082;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();
const { SHOPIFY_API_SECRET, SHOPIFY_API_KEY, SCOPES } = process.env;

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
  const shopQuery =  query["shop"]
  let { shop, accessToken } = session;

  // If I'm logged in through the online flow, I set the offline token to Shopify API
  if (shop && accessToken) {
    let serverToken = accessToken
    const item = await db.getItem({ store: shop, sk: "settings" });
    if (_.get(item, "Item.accessToken")) {
      serverToken = _.get(item, "Item.accessToken")
    }
    shopify.setSettings({ shopName: shop, accessToken: serverToken })
  } else if (shopQuery) {
    shop = shopQuery
    const isValid = validateSignature(query)
    console.log('is Sopify signature valid for', ctx.url, ':', isValid);

    const item = await db.getItem({ store: shop, sk: "settings" });
    if (_.get(item, "Item.accessToken")) {
      shopify.setSettings({ shopName: shop, accessToken: _.get(item, "Item.accessToken") })
    }
  }

  await next();
}

/**
 * If there is no permanent token in the db, I use the offline token flow
 * else I use the online token flow
 * + During the first install, just after the offline flow, I redirect the user
 * once again to /auth to trigger the online flow
 * @param {*} ctx
 * @param {*} next
 */
async function forceOnlineMode(ctx, next) {
  const { session, query } = ctx;
  const shopQuery =  query["shop"]
  const { shop, accessToken, associatedUser } = session;
  let forceOnlineMode = false;

  if (ctx.url.includes("/auth/") || ctx.url.endsWith("/auth")) {
    const item = await db.getItem({ store: shopQuery, sk: "settings" });
    if (_.get(item, "Item.accessToken")) {
      forceOnlineMode = true;
    }
  } else if (!ctx.url.startsWith("/_next/") && shop && accessToken && !associatedUser) {
    ctx.redirect(`/auth/inline?shop=${shop}`);

    return;
  }

  await next();

  if (
    forceOnlineMode &&
    ctx.response.get("location").includes("oauth/authorize")
  ) {
    ctx.response.set(
      "location",
      `${ctx.response.get("location")}&grant_options[]=per-user`
    );
  }
}

cron.init();
cacheProvider.start(function (err) {
  if (err) console.error(err)
})

app.prepare().then(() => {
  const server = new Koa();
  server.proxy = true;
  const router = new Router();

  server.use(cors());
  server.use(
    session(
      {
        sameSite: "none",
        secure: true,
      },
      server
    )
  );
  server.keys = [SHOPIFY_API_SECRET];
  server.use(forceOnlineMode);
  server.use(prepareAuthSession)
  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET,
      scopes: [SCOPES],
      accessMode: "offline",
      async afterAuth(ctx) {
        //Auth token and shop available in session
        //Redirect to shop upon auth
        const { shop, accessToken } = ctx.session;
        let registerOffline = true;

        await db.createTable();
        let item = await db.getItem({ store: shop, sk: "settings" });
        if (_.get(item, "Item.accessToken")) {
          registerOffline = false;
        }

        if (!item || _.isEmpty(item)) {
          await db.addItem({
            store: shop,
            sk: "settings",
            accessToken: accessToken,
          });
        } else if (!_.get(item, "Item.accessToken")) {
          const key = { store: shop, sk: "settings" };

          var changeset = {
            UpdateExpression: "set #token = :x",
            ExpressionAttributeNames: { "#token": "accessToken" },
            ExpressionAttributeValues: { ":x": accessToken },
          };

          await db.updateItem(key, changeset);
        }

        ctx.cookies.set("shopOrigin", shop, {
          httpOnly: false,
          secure: true,
          sameSite: "none",
        });

        if (registerOffline) {
          webhooks.create(ctx.hostname, accessToken, shop);
        } else {
          ctx.cookies.set("user", JSON.stringify(ctx.session.associatedUser), {
            httpOnly: false,
            secure: true,
            sameSite: "none",
          });
          console.log('user', ctx.session.associatedUser);
        }

        ctx.redirect("/");
      },
    })
  );
  server.use(
    graphQLProxy({
      version: ApiVersion.July20,
    })
  );
  server.use(defaultRouter.routes(), defaultRouter.allowedMethods());
  // defaultRouter.get("*", verifyRequest(), async ctx => {
  //   await handle(ctx.req, ctx.res);
  //   ctx.respond = false;
  //   ctx.res.statusCode = 200;
  // });
  router.get("(.*)", verifyRequest(), async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });
  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
