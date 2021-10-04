import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { get, put, post, getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-04/orders.json
    Retrieves a list of orders

    GET /admin/api/2020-04/orders/#{order_id}.json
    Retrieves a specific order

    GET /admin/api/2020-04/orders/count.json
    Retrieves an order count

    POST /admin/api/2020-04/orders/#{order_id}/close.json
    Closes an order

    POST /admin/api/2020-04/orders/#{order_id}/open.json
    Re-opens a closed order

    POST /admin/api/2020-04/orders/#{order_id}/cancel.json
    Cancels an order

    POST /admin/api/2020-04/orders.json
    Creates an order

    PUT /admin/api/2020-04/orders/#{order_id}.json
    Updates an order

    DELETE /admin/api/2020-04/orders/#{order_id}.json
    Deletes an order

    POST /admin/api/2021-07/orders/{order_id}/refunds.json
    Creates a refund

    POST /admin/api/2021-07/orders/{order_id}/refunds/calculate.json
    Calculates a refund

    GET /admin/api/2021-07/orders/{order_id}/refunds.json
    Retrieves a list of refunds for an order

    GET /admin/api/2021-07/orders/{order_id}/refunds/{refund_id}.json
    Retrieves a specific refund

    GRAPHQL MUTATION
    mutation orderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!)
 */

/**
 * Requires write_order_edits right
 * @param {*} graphQLOrderId
 * @returns
 */
const orderEditBegin = async (graphQLOrderId) => {
  const query = {
    query: `mutation orderEditBegin($id: ID!) {
      orderEditBegin(id: $id) {
        calculatedOrder {
          id
          lineItems(first: 10) {
            edges {
              node {
                id
                variant {
                  sku
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    variables: graphQLOrderId
  };

  let result = null;
  try {
    const req = await post(`/graphql.json`, query);
    result = req.data.data.orderEditBegin.calculatedOrder;
  } catch (e) {
    console.log(
      "orderEditBegin error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
}

/**
 * Requires write_order_edits right
 * @param {*} graphQLOrderId
 * @returns
 */
const orderEditCommit = async (changeset) => {
  // let changeset = {
  //   "id": "", => The calculated order id (from orderBegin)
  //   "notifyCustomer": "", => true or false
  //   "staffNote": "" => string for the staff
  // }
  const query = {
    query: `mutation orderEditCommit($id: ID!) {
      orderEditCommit(id: $id) {
        userErrors {
          field
          message
        }
        order {
          id
        }
      }
    }`,
    variables: changeset
  };

  let result = null;
  try {
    const req = await post(`/graphql.json`, query);

    result = req.data.data.orderEditCommit
  } catch (e) {
    console.log(
      "orderEditCommit error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
}

/**
 * Requires write_order_edits right
 * @param {*} changeset
 * @returns
 */
export const orderEditSetQuantity = async (changeset) => {
  // orderId : id of the ORIGINAL order (not the calculated one)
  // sku : sku of the item in the ORIGINAL order (we'll use the sku to compare it with the calculated lieneitem id)
  // quantity : new qty
  // locationId : location of the stock
  // restock : do we restock if we remove a qty from the order ?
  // let changeset = {
  //   "id": "",
  //   "sku": "",
  //   "quantity": "",
  //   "locationId": "",
  //   "restock": ""
  // }
  let result = null;
  const calculatedOrder = await orderEditBegin({ id: changeset.id })
  //console.log('calculatedOrder', calculatedOrder.lineItems.edges[0]);
  const lineItemToChange = calculatedOrder.lineItems.edges.filter(item => item.node.variant.sku == changeset.sku)

  if (lineItemToChange.length > 0) {
    changeset['id'] = calculatedOrder.id
    changeset['lineItemId'] = lineItemToChange[0].node.id

    const query = {
      query: `mutation orderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!) {
        orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity) {
          userErrors {
            field
            message
          }
          calculatedLineItem {
            id
          }

          calculatedOrder {
            id
          }
        }
      }`,
      variables: changeset
    };

    try {
      const req = await post(`/graphql.json`, query);
      console.log("req", req.data);
      result = req.data.data
    } catch (e) {
      console.log(
        "orderEditSetQuantity error :",
        _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
      );
    }

    const commitOrder = await orderEditCommit({ id: calculatedOrder.id })
    console.log('commitOrder', commitOrder);
  }

  return result;
};

export const getAllOrdersGQL = async (filter = "") => {
  //filter = "created_at:>'2020-05-30T00:00:00+0100' AND fulfillment_status:unshipped";
  // filter = "created_at:>'2020-05-30T00:00:00+0100' AND fulfillment_status:unshipped AND tag:'fastmag_5869027'"
  const orders = [];
  let req = null;
  let cursor = null;
  let firstCall = true;

  try {
    while (firstCall || cursor) {
      if (firstCall) {
        firstCall = false;
      }
      const query = {
        query: `{
          orders(first: 99, query:"${filter}", after: ${cursor}) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                legacyResourceId
                name
                note
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                metafield(namespace:"global", key:"fastmag-order-id") {
                  id
                  key
                  value
                }
                shippingAddress {
                  id
                  address1
                  address2
                  zip
                  city
                }
                customer {
                  id
                  firstName
                  lastName
                  email
                }
                fulfillments {
                  id
                  legacyResourceId
                  status
                  displayStatus
                  trackingInfo {
                    company
                    number
                    url
                  }
                  events (first:1, reverse:true) {
                    edges {
                      node {
                        status
                        happenedAt
                      }
                    }
                  }
                }
                tags
                customAttributes {
                  key
                  value
                }
              }
            }
          }
        }`,
      };
      req = await post(`/graphql.json`, query);
      const pageOrders = req.data.data.orders.edges;
      orders.push(...pageOrders);
      cursor =
        pageOrders[pageOrders.length - 1] &&
        pageOrders[pageOrders.length - 1].cursor
          ? `"${pageOrders[pageOrders.length - 1].cursor}"`
          : false;
    }
  } catch (e) {
    console.log(
      "getAllOrdersGQ error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return orders;
};

/**
 *
 * @param {*} filter
 */
export const getAllOrders = async (filter = []) => {
  filter = ["limit=250", ...filter];
  const queryString = filter.join("&");

  console.log("queryString", `/orders.json?${queryString}`);

  let nextPage = `/orders.json?${queryString}`;
  let arResult = [];

  try {
    while (nextPage) {
      const result = await get(nextPage);
      arResult = [...arResult, ...result.data.orders];
      nextPage = getNextPage(result.headers);
    }
  } catch (e) {
    console.log(
      "getAllOrders error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return arResult;
};

export const getOrder = async (id) => {
  const result = await get(`/orders/${id}.json`);

  return result.data.order;
};

export const getOrderMetafields = async (id) => {
  const result = await get(`/orders/${id}/metafields.json`);

  return result.data.metafields;
};

/**
 * @param {*} orderId
 * @param {*} changeset
 */
export const updateOrder = async (orderId, changeset, async = false) => {
  changeset = {
    order: {
      id: orderId,
      ...changeset,
    },
  };
  //console.log(changeset)

  if (!async) {
    let result = false;
    try {
      result = await put(`/orders/${orderId}.json`, changeset);
    } catch (e) {
      console.log("error in shopify.updateOrder", e.response.data);
      return false;
    }

    return result.data;
  } else {
    return put(`/orders/${orderId}.json`, changeset);
  }
};

export const closeOrder = async (id) => {
  const result = await post(`/orders/${id}/close.json`, {});

  return result.data.order;
};

export const reopenOrder = async (id) => {
  const result = await post(`/orders/${id}/open.json`, {});

  return result.data.order;
};

export const cancelOrder = async (id) => {
  const result = await post(`/orders/${id}/cancel.json`, {});

  return result.data.order;
};

/**
 *POST /admin/api/2021-07/orders/{order_id}/refunds.json
 * @param {*} orderId
 * @param {*} changeset
 */
 export const refundsOrder = async (orderId, changeset, async = false) => {
  changeset = {
    order: {
      id: orderId,
      ...changeset,
    },
  };
  //console.log(changeset)

  if (!async) {
    let result = false;
    try {
      result = await put(`/orders/${orderId}/refunds.json`, changeset);
      console.log('result', result);

    } catch (e) {
      console.log("error in shopify.refundsOrder", e.response.data);
      return false;
    }

    return result.data;
  } else {
    return put(`/orders/${orderId}/refunds.json`, changeset);
  }
 };
