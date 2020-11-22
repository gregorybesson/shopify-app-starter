import Router from "koa-router";
import { receiveWebhook, registerWebhook } from "@shopify/koa-shopify-webhooks";
import axios from "axios";
import * as shopify from "../../server/shopify";
import * as db from "../../server/database";
import _ from "lodash";
import { Liquid } from "liquidjs";

const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

let transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    apiVersion: "2010-12-01",
  }),
});

const { EMAIL_FROM, SHOPIFY_API_SECRET, SHOP } = process.env;
const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET });
const webhooksRouter = new Router({ prefix: "/webhook" });

/**
 *
 */
webhooksRouter.post("/orders/create", webhook, async (ctx) => {
  const order = ctx.request.body;

  console.log("order created", order);

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

/**
 *
 */
webhooksRouter.post("/customers/create", webhook, async (ctx) => {
  const customer = ctx.request.body;

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

/**
 *
 */
webhooksRouter.post("/customers/update", webhook, async (ctx) => {
  const customer = ctx.request.body;
  console.log("customer updated", customer.id);

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

/**
 *
 */
webhooksRouter.post("/refunds/create", webhook, async (ctx) => {
  const refunds = ctx.request.body;
  console.log("refunds created", refunds);

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

webhooksRouter.post("/app/uninstalled", webhook, async (ctx) => {
  console.log("/app/uninstalled called");

  const appli = ctx.request.body;
  console.log("app uninstalled", appli);

  ctx.body = {
    status: "success",
    result: "ok",
  };
});

export default webhooksRouter;
