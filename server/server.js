import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import Cookies from "cookies";
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
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();
const { SHOPIFY_API_SECRET, SHOPIFY_API_KEY, SCOPES, DATABASE } = process.env;

async function prepareAuthSession(ctx, next) {
  const { session, query } = ctx;
  const shopQuery =  query["shop"]
  let { shop, accessToken } = session;
  if (shop && accessToken) {
    shopify.setSettings({ shopName: shop, accessToken: accessToken })
  } else if (shopQuery) {
    shop = shopQuery
    const isValid = validateSignature(query)
    const item = await db.getItem({ store: shop, sk: "settings" });
    if (_.get(item, "Item.accessToken")) {
      shopify.setSettings({ shopName: shop, accessToken: _.get(item, "Item.accessToken") })
    }
  }

  await next();
}

async function forceOnlineMode(ctx, next) {
  const { session, query } = ctx;
  const { accessToken } = session;
  const { shop } = query;
  let forceOnlineMode = false;

  //console.log('session.accessToken', accessToken, shop, ctx.url);
  // console.log('ctx.session.associatedUser', ctx.session.associatedUser);

  if (ctx.url.includes("/auth/") || ctx.url.endsWith("/auth")) {
    //console.log('on va check la bdd');
    const item = await db.getItem({ store: shop, sk: "settings" });
    //console.log('item', item);
    if (_.get(item, "Item.accessToken")) {
      // I have already the offline accessToken, I need now to know whose connected
      //console.log('force online mode');
      forceOnlineMode = true;
    }
  } else {
    forceOnlineMode = false;
  }

  await next();

  if (
    forceOnlineMode &&
    ctx.response.get("location").includes("oauth/authorize")
  ) {
    //console.log('location', ctx.response.get('location'));

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
  // FIX : DOES NOT WORK The redirect loop with chrome incognito or Safari
  // server.use((ctx, next) => {
  //   const cookies = new Cookies(ctx.req, ctx.res, {
  //     keys: server.keys,
  //     secure: true,
  //   });

  //   const originalCookieSet = cookies.set.bind(cookies);

  //   const patched = function set(name, value, opts) {
  //     const patch = { sameSite: 'none' };
  //     const patchedOpts = opts ? { ...opts, ...patch } : patch;
  //     return originalCookieSet(name, value, patchedOpts);
  //   };

  //   cookies.set = patched.bind(cookies);
  //   ctx.cookies = cookies;
  //   return next();
  // });

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
        // else if (item.Item.accessToken !== accessToken) {
        //   const key = { store: shop, sk: "settings" };

        //   var changeset = {
        //     UpdateExpression: "set #token = :x",
        //     ExpressionAttributeNames: { "#token": "accessToken" },
        //     ExpressionAttributeValues: { ":x": accessToken },
        //   };

        //   await db.updateItem(key, changeset);
        // }

        ctx.cookies.set("shopOrigin", shop, {
          httpOnly: false,
          secure: true,
          sameSite: "none",
        });

        //console.log('ctx.session', ctx.session);

        ctx.cookies.set("user", JSON.stringify(ctx.session.associatedUser), {
          httpOnly: false,
          secure: true,
          sameSite: "none",
        });

        if (registerOffline) {
          webhooks.create(ctx.hostname, accessToken, shop);
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
