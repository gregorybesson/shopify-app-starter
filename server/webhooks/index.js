import dotenv from "dotenv";
import { receiveWebhook, registerWebhook } from "@shopify/koa-shopify-webhooks";

dotenv.config();

const webhooks = process.env.WEBHOOKS.split(',')

export const create = async (hostname, accessToken, shop) => {
  const apiVersion = "2020-07";

  if (webhooks.includes("ORDERS_CREATE")) {
    const registration = await registerWebhook({
      address: `https://${hostname}/app/webhook/orders/create`,
      topic: "ORDERS_CREATE",
      accessToken,
      shop,
      apiVersion: apiVersion,
    });

    if (registration.success) {
      console.log("Successfully registered ORDERS_CREATE webhook!");
    } else {
      console.log(
        "Failed to register ORDERS_CREATE webhook",
        registration.result
      );
    }
  }
  if (webhooks.includes("CUSTOMERS_CREATE")) {
    const customerCreate = await registerWebhook({
      address: `https://${hostname}/app/webhook/customers/create`,
      topic: "CUSTOMERS_CREATE",
      accessToken,
      shop,
      apiVersion: apiVersion,
    });

    if (customerCreate.success) {
      console.log("Successfully registered CUSTOMERS_CREATE webhook!");
    } else {
      console.log(
        "Failed to register CUSTOMERS_CREATE webhook",
        customerCreate.result
      );
    }
  }

  if (webhooks.includes("CUSTOMERS_UPDATE")) {
    const customerUpdate = await registerWebhook({
      address: `https://${hostname}/app/webhook/customers/update`,
      topic: "CUSTOMERS_UPDATE",
      accessToken,
      shop,
      apiVersion: apiVersion,
    });

    if (customerUpdate.success) {
      console.log("Successfully registered CUSTOMERS_UPDATE webhook!");
    } else {
      console.log(
        "Failed to register CUSTOMERS_UPDATE webhook",
        customerUpdate.result
      );
    }
  }

  if (webhooks.includes("REFUNDS_CREATE")) {
    const refundsCreate = await registerWebhook({
      address: `https://${hostname}/app/webhook/refunds/create`,
      topic: "REFUNDS_CREATE",
      accessToken,
      shop,
      apiVersion: apiVersion,
    });

    if (refundsCreate.success) {
      console.log("Successfully registered REFUNDS_CREATE webhook!");
    } else {
      console.log(
        "Failed to register REFUNDS_CREATE webhook",
        refundsCreate.result
      );
    }
  }
  console.log('webhooks', webhooks);

  const uninstallRegistration = await registerWebhook({
    address: `https://${hostname}/app/webhook/uninstalled`,
    topic: "APP_UNINSTALLED",
    accessToken,
    shop,
    apiVersion: apiVersion,
  });

  if (uninstallRegistration.success) {
    console.log("Successfully registered APP_UNINSTALLED webhook!");
  } else {
    console.log(
      "Failed to register APP_UNINSTALLED webhook",
      uninstallRegistration.result
    );
  }
};
