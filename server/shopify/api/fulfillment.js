import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";

import { get, put, post, del, getUrl, getSettings, getHeaders } from "../query";
import { getFulfillmentServiceByName, getFulfillmentServices } from "./fulfillmentService";
import { fulfillmentOrders } from "./order";

dotenv.config();

/**
 *  GET /admin/api/2020-04/orders/#{order_id}/fulfillments.json
    Retrieves fulfillments associated with an order

    GET /admin/api/2020-04/fulfillment_orders/#{fulfillment_order_id}/fulfillments.json
    Retrieves fulfillments associated with a fulfillment order

    GET /admin/api/2020-04/orders/#{order_id}/fulfillments/count.json
    Retrieves a count of fulfillments associated with a specific order

    GET /admin/api/2020-04/orders/#{order_id}/fulfillments/#{fulfillment_id}.json
    Receive a single Fulfillment

    POST /admin/api/2020-04/orders/#{order_id}/fulfillments.json
    Create a new Fulfillment

    POST /admin/api/2020-04/fulfillments.json
    Creates a fulfillment for one or many fulfillment orders

    PUT /admin/api/2020-04/orders/#{order_id}/fulfillments/#{fulfillment_id}.json
    Modify an existing Fulfillment

    POST /admin/api/2020-04/fulfillments/#{fulfillment_id}/update_tracking.json
    Updates the tracking information for a fulfillment

    POST /admin/api/2020-04/orders/#{order_id}/fulfillments/#{fulfillment_id}/complete.json
    Complete a fulfillment

    POST /admin/api/2020-04/orders/#{order_id}/fulfillments/#{fulfillment_id}/open.json
    Transition a fulfillment from pending to open.

    POST /admin/api/2020-04/orders/#{order_id}/fulfillments/#{fulfillment_id}/cancel.json
    Cancel a fulfillment for a specific order ID

    POST /admin/api/2020-04/fulfillments/#{fulfillment_id}/cancel.json
    Cancels a fulfillment
*/

export const getFulfillments = async (orderId) => {
  const result = await get(
    `/orders/${orderId}/fulfillments.json`
  );

  return result.data.fulfillments;
};

export const getFulfillment = async (orderId, fulfillmentId) => {
  const result = await get(
    `/orders/${orderId}/fulfillments/${fulfillmentId}.json`
  );

  return result.data.fulfillment;
};

export const getFulfillmentOrderFulfillments = async (fulfillment_order_id) => {
  const result = await get(
    `/fulfillment_orders/${fulfillment_order_id}/fulfillments.json`
  );

  return result.data.fulfillments;
};

/**
 * This method is the new one to handle fulfillmentOrders
 * @param {*} orderId
 * @returns
 */
export const createOrderFulfillment = async (orderId) => {
  const fulfillmentsservices = await getFulfillmentServices();
  //console.log('fulfillmentsservices', fulfillmentsservices);

  let locationId = _.get(fulfillmentsservices, "[0].location.id", null);
  locationId = locationId.split("/").pop();
  const fulfillments = await fulfillmentOrders(orderId);
  //console.log('fulfillments', fulfillments);

  const lineItemsByFulfillmentOrder = fulfillments.map(fulfillmentOrder => {
    const fulfillmentOrderLineItems = fulfillmentOrder.line_items.map(lineItem => {
      return {
        id: lineItem.id,
        quantity: lineItem.quantity
      }
    })
    return {
      fulfillment_order_id: fulfillmentOrder.id,
      fulfillment_order_line_items: fulfillmentOrderLineItems
    }
  })

  //console.log('lineItemsByFulfillmentOrder', lineItemsByFulfillmentOrder);

  let result = null;
  try {
    const req = await post(
      `/orders/${orderId}/fulfillments.json`,
      {
        fulfillment: {
          location_id: locationId,
          message: "Order transmitted to JDE",
          notify_customer: false,
          tracking_info: {
            number: 1562678,
            url: "https://www.my-shipping-company.com",
            company: "my-shipping-company"
          },
          line_items_by_fulfillment_order: lineItemsByFulfillmentOrder
        }
      }
    );

    result = req.data.fulfillment;
  } catch (e) {
    console.log(
      "createOrderFulfillment error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

/**
 * DEPRECATED old method to handle fulfillments based on location
 * @param {*} orderId
 * @returns
 */
export const createFulfillment = async (orderId) => {
  const fulfillmentsservices = await getFulfillmentServices();
  console.log('fulfillmentsservices', fulfillmentsservices);

  let locationId = _.get(fulfillmentsservices, "[0].location.id", null);
  locationId = locationId.split("/").pop();
  let result = null;
  try {
    const req = await post(
      `/orders/${orderId}/fulfillments.json`,
      {
        fulfillment: {
          location_id: locationId,
        },
      }
    );

    result = req.data.fulfillment;
  } catch (e) {
    console.log(
      "createFulfillment error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const updateFulfillment = async (orderId, fulfillmentId, changeset) => {
  const result = await put(
    `/orders/${orderId}/fulfillments/${fulfillmentId}.json`,
    {
      fulfillment: changeset,
    }
  );

  return result.data.fulfillment;
};

export const updateTracking = async (fulfillmentId, changeset) => {
  // changeset = {
  //   "notify_customer": true,
  //   "tracking_info": {
  //     "number": "1111",
  //     "url": "http://www.my-url.com",
  //     "company": "my-company"
  //   }
  // }
  const result = await post(
    `/fulfillments/${fulfillmentId}/update_tracking.json`,
    {
      fulfillment: changeset,
    }
  );

  return result.data.fulfillment;
};

export const openFulfillment = async (orderId, fulfillmentId) => {
  const result = await post(
    `/orders/${orderId}/fulfillments/${fulfillmentId}/open.json`,
    {}
  );

  return result.data.fulfillment;
};

export const completeFulfillment = async (orderId, fulfillmentId) => {
  const result = await post(
    `/orders/${orderId}/fulfillments/${fulfillmentId}/complete.json`,
    {}
  );

  return result.data.fulfillment;
};

export const cancelFulfillment = async (orderId, fulfillmentId) => {
  const result = await post(
    `/orders/${orderId}/fulfillments/${fulfillmentId}/cancel.json`,
    {}
  );

  return result.data.fulfillment;
};

/**
 * Request granular acces to migrate to fulfillmentOrder (instead of dulfillment)
 */
export const requestGranularAccess = async () => {
  const settings = getSettings();
  const result = await axios.post(
    `https://${settings.shopName}/admin/request_granular_access_scopes.json`,
    {
      "requested_scopes": [
        "write_assigned_fulfillment_orders",
        "write_merchant_managed_fulfillment_orders"
      ]
    },
    {
      headers: getHeaders(),
    }
  );

  console.log('result', result);


}