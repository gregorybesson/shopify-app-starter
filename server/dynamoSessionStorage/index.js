// Import the Session type from the library, along with the Node redis package, and `promisify` from Node
import {Session} from '@shopify/shopify-api/dist/auth/session';
import _ from "lodash";
import * as db from "../database";
import Shopify from "@shopify/shopify-api";

async function storeCallback(session) {
  //console.log('storeCallback called', session);

  const payload = { ...session }
  payload.expires = '' + session.expires
  //delete payload.id
  const sk = `session#id#${session.id}`;

  try {
    let record = await db.addItem({
      store: 'all',
      sk: sk,
      session: payload
    });

    if (!record) {
      const key = { store: 'all', sk: sk };
      var changeset = {
        UpdateExpression: "set #session = :x",
        ExpressionAttributeNames: { "#session": "session" },
        ExpressionAttributeValues: { ":x": payload },
      };

      await db.updateItem(key, changeset);
    }

    return true
  } catch (err) {
    console.log('err', err);

    return false
  }
}

async function loadCallback(id) {
  const sk = `session#id#${id}`;
  const key = { store: 'all', sk: sk };
  const item = await db.getItem(key);

  if (!_.isEmpty(item) && _.get(item, "Item.session")) {
    const session = new Session(id)
    const { shop, state, scope, accessToken, isOnline, expires, onlineAccessInfo } = _.get(item, "Item.session")
    session.shop = shop
    session.state = state
    session.scope = scope
    session.expires = expires ? new Date(expires) : undefined
    session.isOnline = isOnline
    session.accessToken = accessToken
    session.onlineAccessInfo = onlineAccessInfo

    return session
  }

  return undefined
}

async function deleteCallback(id) {
  console.log('deleteCallback called', id);
  const sk = `session#id#${id}`;
  const key = { store: 'all', sk: sk };
  const result = await db.removeItem(key);

  return result;
}

export const DynamoSessionStorage = new Shopify.Session.CustomSessionStorage(
  storeCallback,
  loadCallback,
  deleteCallback,
)