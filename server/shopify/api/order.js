import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

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

 */

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
      req = await axios.post(`${getUrl()}/graphql.json`, query);
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

  console.log("queryString", `${getUrl()}/orders.json?${queryString}`);

  let nextPage = `${getUrl()}/orders.json?${queryString}`;
  let arResult = [];

  try {
    while (nextPage) {
      const result = await axios.get(nextPage);
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
  const result = await axios.get(`${getUrl()}/orders/${id}.json`);

  return result.data.order;
};

export const getOrderMetafields = async (id) => {
  const result = await axios.get(`${getUrl()}/orders/${id}/metafields.json`);

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
      result = await axios.put(`${getUrl()}/orders/${orderId}.json`, changeset);
    } catch (e) {
      console.log("error in shopify.updateOrder", e.response.data);
      return false;
    }

    return result.data;
  } else {
    return axios.put(`${getUrl()}/orders/${orderId}.json`, changeset);
  }
};

export const closeOrder = async (id) => {
  const result = await axios.post(`${getUrl()}/orders/${id}/close.json`, {});

  return result.data.order;
};

export const reopenOrder = async (id) => {
  const result = await axios.post(`${getUrl()}/orders/${id}/open.json`, {});

  return result.data.order;
};

export const cancelOrder = async (id) => {
  const result = await axios.post(`${getUrl()}/orders/${id}/cancel.json`, {});

  return result.data.order;
};
