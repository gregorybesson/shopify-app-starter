import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/custom_collections.json
    Retrieves a list of custom collections

    GET /admin/api/2020-07/custom_collections/count.json
    Retrieves a count of custom collections

    GET /admin/api/2020-07/custom_collections/{custom_collection_id}.json
    Retrieves a single custom collection

    POST /admin/api/2020-07/custom_collections.json
    Creates a custom collection

    PUT /admin/api/2020-07/custom_collections/{custom_collection_id}.json
    Updates an existing custom collection

    DELETE /admin/api/2020-07/custom_collections/{custom_collection_id}.json
    Deletes a custom collection
 */

export const getCustomCollections = async () => {
  const result = await axios.get(`${getUrl()}/custom_collections.json`);

  return result.data.custom_collections;
};

export const getCustomCollection = async (id) => {
  const result = await axios.get(`${getUrl()}/custom_collections/${id}.json`);

  return result.data.custom_collection;
};

export const createCustomCollection = async (changeset) => {
  const result = await axios.post(`${getUrl()}/custom_collections.json`, {
    custom_collection: changeset,
  });

  return result.data.collect;
};

export const updateCustomCollection = async (id, changeset) => {
  changeset = {
    id: id,
    ...changeset,
  };
  const result = await axios.put(`${getUrl()}/custom_collections/${id}.json`, {
    custom_collection: changeset,
  });

  //console.log("updateCustomCollection", result);

  return result.data;
};

export const deleteCustomCollection = async (id) => {
  const result = await axios.delete(
    `${getUrl()}/custom_collections/${id}.json`
  );

  return result.data;
};
