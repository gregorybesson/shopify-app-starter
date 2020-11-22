import { receiveWebhook, registerWebhook } from "@shopify/koa-shopify-webhooks";

export const create = async (hostname, accessToken, shop) => {
  const apiVersion = "2020-07";

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

  const uninstallRegistration = await registerWebhook({
    address: `https://${hostname}/app/webhook/app/uninstalled`,
    topic: "app/uninstalled",
    accessToken,
    shop,
    apiVersion: apiVersion,
  });

  if (registration.success) {
    console.log("Successfully registered app/uninstalled webhook!");
  } else {
    console.log(
      "Failed to register app/uninstalled webhook",
      registration.result
    );
  }
};
