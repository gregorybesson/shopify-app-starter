import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/smart_collections.json
    Retrieves a list of smart collections

    GET /admin/api/2020-07/smart_collections/count.json
    Retrieves a count of smart collections

    GET /admin/api/2020-07/smart_collections/{smart_collection_id}.json
    Retrieves a single smart collection

    POST /admin/api/2020-07/smart_collections.json
    Creates a smart collection

    PUT /admin/api/2020-07/smart_collections/{smart_collection_id}.json
    Updates an existing smart collection

    PUT /admin/api/2020-07/smart_collections/{smart_collection_id}/order.json?products[]=921728736&products[]=632910392
    Updates the ordering type of products in a smart collection

    DELETE /admin/api/2020-07/smart_collections/{smart_collection_id}.json
    Removes a smart collection
 */

export const getSmartCollections = async (filter = []) => {
  filter = ["limit=250", ...filter];
  const queryString = filter.join("&");

  console.log(
    "queryString",
    `${getUrl()}/smart_collections.json?${queryString}`
  );

  let nextPage = `${getUrl()}/smart_collections.json?${queryString}`;
  let arResult = [];

  try {
    while (nextPage) {
      const result = await axios.get(nextPage);
      arResult = [...arResult, ...result.data.smart_collections];
      nextPage = getNextPage(result.headers);
    }
  } catch (e) {
    console.log(
      "smart_collections error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return arResult;
};

export const getSmartCollection = async (id) => {
  const result = await axios.get(`${getUrl()}/smart_collections/${id}.json`);

  return result.data.smart_collection;
};

export const createSmartCollection = async (changeset) => {
  let result = null;
  try {
    const req = await axios.post(`${getUrl()}/smart_collections.json`, {
      smart_collection: changeset,
    });
    result = req.data.smart_collection;
  } catch (e) {
    console.log(
      "getSmartCollections error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const updateSmartCollection = async (id, changeset) => {
  changeset = {
    id: id,
    ...changeset,
  };
  const result = await axios.put(`${getUrl()}/smart_collections/${id}.json`, {
    smart_collection: changeset,
  });

  //console.log("updateCustomCollection", result);

  return result.data;
};

export const updateSmartCollectionOrder = async (id, changeset) => {
  changeset = {
    id: id,
    ...changeset,
  };
  const result = await axios.put(
    `${getUrl()}/smart_collections/${id}/order.json`,
    {
      smart_collection: changeset,
    }
  );

  //console.log("updateCustomCollection", result);

  return result.data;
};

export const deleteSmartCollection = async (id) => {
  const result = await axios.delete(`${getUrl()}/smart_collections/${id}.json`);

  return result.data;
};
