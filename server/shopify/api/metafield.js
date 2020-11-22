import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/metafields.json
    Retrieves a list of metafields that belong to a resource

    GET /admin/api/2020-07/metafields.json?metafield[owner_id]=850703190&metafield[owner_resource]=product_image
    Retrieves a list of metafields that belong to a Product Image resource

    GET /admin/api/2020-07/metafields/count.json
    Retrieves a count of a resource's metafields

    GET /admin/api/2020-07/metafields/{metafield_id}.json
    Retrieves a single metafield from a resource by its ID

    POST /admin/api/2020-07/metafields.json
    Creates a new metafield for a resource

    PUT /admin/api/2020-07/metafields/{metafield_id}.json
    Updates a metafield

    DELETE /admin/api/2020-07/metafields/{metafield_id}.json
    Deletes a metafield by its ID
 */

/**
 *
 * @param {*} id
 * @param {*} type collections, blogs, products, pages, customers, orders, draft_orders
 * @param {*} changeset value_type being one of string, integer, json_string
 */
export const setMetafield = async (id, type, changeset) => {
  let success = true;
  // const changeset = {
  //    namespace: "cms",
  //    key: "related_products",
  //    value: "{\"id\": \"12\"}",
  //    value_type: "json_string",
  // }
  try {
    await axios.post(`${getUrl()}/${type}/${id}/metafields.json`, {
      metafield: changeset,
    });
  } catch (e) {
    console.log("error", e);

    success = false;
  }

  return success;
};

/**
 *
 * @param {*} id id of the entity
 * @param {*} type pages, collections, products, blogs,...
 * @param {*} key key of the metafield
 */
export const getMetafield = async (id, type, key) => {
  let result = [];
  try {
    await axios
      .get(
        `${getUrl()}/${type}/${id}/metafields.json?[namespace]=cms&[key]=${key}`
      )
      .then((response) => {
        result = response.data.metafields;
      });
  } catch (e) {
    console.log("error", e);
  }

  return result;
};

/**
 *
 * @param {*} id
 * @param {*} type
 * @param {*} metafieldId
 */
export const deleteMetafield = async (id, type, metafieldId) => {
  let success = true;
  try {
    await axios.delete(
      `${getUrl()}/${type}/${id}/metafields/${metafieldId}.json`
    );
  } catch (e) {
    console.log("error", e);
    success = false;
  }

  return success;
};

export const updateMetafield = async (id, type, changeset) => {
  let success = true;
  // const changeset = {
  //    id: data.id,
  //    value: data.value,
  // }
  try {
    await axios.put(
      `${getUrl()}/${type}/${id}/metafields/${changeset.id}.json`,
      {
        metafield: changeset,
      }
    );
  } catch (e) {
    console.log("error", e);
    success = false;
  }

  return success;
};
