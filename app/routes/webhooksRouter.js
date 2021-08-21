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
webhooksRouter.post("/uninstalled", webhook, async (ctx) => {
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

/**
 * Payload
 *{
 * shop_id: 954889,
 * shop_domain: "snowdevil.myshopify.com",
 * orders_requested: [299938, 280263, 220458],
 * customer: {
 *  id: 191167,
 *   email: "john@email.com",
 *   phone: "555-625-1199",
 * },
 * data_request: {
 *   id: 9999,
 * },
 *};
*/
webhooksRouter.post("/gdpr/customers_data_request", async (ctx) => {
  console.log(ctx.request.body);
});

/**
 * Payload
 * {
 *   shop_id: 954889,
 *   shop_domain: "snowdevil.myshopify.com",
 *   customer: {
 *     id: 191167,
 *     email: "john@email.com",
 *     phone: "555-625-1199",
 *   },
 *   orders_to_redact: [299938, 280263, 220458],
 * };
*/
webhooksRouter.post("/gdpr/customers_redact", async (ctx) => {
  console.log(ctx.request.body);
});

/**
 * Payload
 * {
 *   shop_id: 954889,
 *   shop_domain: "snowdevil.myshopify.com",
 * };
*/
webhooksRouter.post("/gdpr/shop_redact", async (ctx) => {
  console.log(ctx.request.body);
});

export default webhooksRouter;
