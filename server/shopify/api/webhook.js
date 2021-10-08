import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";

import { get, put, post, del, getUrl } from "../query";

dotenv.config();

/**
 *  POST
    /admin/api/2021-10/webhooks.json
    Create a new Webhook

    GET
    /admin/api/2021-10/webhooks.json
    Retrieves a list of webhooks

    GET
    /admin/api/2021-10/webhooks/{webhook_id}.json
    Receive a single Webhook

    GET
    /admin/api/2021-10/webhooks/count.json
    Receive a count of all Webhooks

    PUT
    /admin/api/2021-10/webhooks/{webhook_id}.json
    Modify an existing Webhook

    DEL
    /admin/api/2021-10/webhooks/{webhook_id}.json
    Remove an existing Webhook
*/

export const getWebhooks = async () => {
  const result = await get(`/webhooks.json`);

  return result.data.webhooks;
};

export const getWebhook = async (id) => {
  const result = await get(`/webhooks/${id}.json`);

  return result.data.webhook;
};

export const createWebhook = async (changeset) => {
  // const changeset = {
  //   "topic": "orders\/create",
  //   "address": "https:\/\/example.hostname.com\/",
  //   "format": "json",
  //   "fields": ["id", "note"]
  // }

  let result = null;
  try {
    const req = await post(`/webhooks.json`, {
      webhook: changeset,
    });

    result = req.data.webhook;
  } catch (e) {
    console.log(
      "createWebhook error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }
  //console.log("createWebhook", result);

  return result;
};

export const updateWebhook = async (id, address) => {
  const changeset = {
    id,
    address,
  };

  const result = await put(`/webhooks/${id}.json`, {
    webhook: changeset,
  });

  return result.data.webhook;
};

export const deleteWebhook = async (id) => {
  const result = await del(`/webhooks/${id}.json`);

  return result.data;
};