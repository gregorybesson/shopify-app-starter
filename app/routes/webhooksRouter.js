import Router from "koa-router";
import { receiveWebhook } from "@shopify/koa-shopify-webhooks";
import * as db from "../../server/database";

const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});

const { SHOPIFY_API_SECRET } = process.env;
const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET });
const webhooksRouter = new Router({ prefix: "/webhook" });

// Register to the desired wehooks by declaring them in your .env

/**
 * We reset the permanent access token of this store
 */
webhooksRouter.post("/app/uninstalled", webhook, async (ctx) => {
  const appli = ctx.request.body;
  const shop = appli.myshopify_domain
  const key = { store: shop, sk: "settings" };
  var changeset = {
    UpdateExpression: "remove #token",
    ExpressionAttributeNames: { "#token": "accessToken" },
  };

  await db.updateItem(key, changeset);
  console.log('shop', shop, "deactivated");

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

export default webhooksRouter;
