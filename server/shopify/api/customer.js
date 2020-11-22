import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/customers.json?updated_at_min=2020-07-08 17:48:51
  Retrieves a list of customers

  GET /admin/api/2020-07/customers/search.json?query=Bob country:United States
  Searches for customers that match a supplied query

  GET /admin/api/2020-07/customers/{customer_id}.json
  Retrieves a single customer

  POST /admin/api/2020-07/customers.json
  Creates a customer

  PUT /admin/api/2020-07/customers/{customer_id}.json
  Updates a customer

  POST /admin/api/2020-07/customers/{customer_id}/account_activation_url.json
  Creates an account activation URL for a customer

  POST /admin/api/2020-07/customers/{customer_id}/send_invite.json
  Sends an account invite to a customer

  DELETE /admin/api/2020-07/customers/{customer_id}.json
  Deletes a customer.

  GET /admin/api/2020-07/customers/count.json
  Retrieves a count of customers

  GET /admin/api/2020-07/customers/{customer_id}/orders.json
  Retrieves all orders belonging to a customer
 */

export const getCustomer = async (id) => {
  let result = null;

  try {
    const req = await axios.get(`${getUrl()}/customers/${id}.json`);

    result = req.data.customer;
  } catch (e) {
    console.log(
      "getCustomer error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const getCustomerMetafields = async (id) => {
  let result = [];
  try {
    const req = await axios.get(`${getUrl()}/customers/${id}/metafields.json`);
    result = req.data.metafields;
  } catch (e) {
    // console.log(
    //   "getCustomerMetafields error :",
    //   _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    // );
  }

  return result;
};

/**
 * When you change the price, be cautious that the compare_at_price is null or is > price
 * @param {*} customerId
 * @param {*} changeset
 */
export const updateCustomer = async (customerId, changeset) => {
  changeset = {
    customer: {
      id: Number(customerId),
      ...changeset,
    },
  };
  //console.log(customerId, changeset)

  let result = null;

  try {
    const customer = await axios.put(
      `${getUrl()}/customers/${customerId}.json`,
      changeset
    );

    result = customer.data;
  } catch (e) {
    console.log(
      "updatecustomer error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};
