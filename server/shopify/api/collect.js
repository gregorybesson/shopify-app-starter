import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  POST /admin/api/2020-07/collects.json
    Adds a product to a custom collection

    DELETE /admin/api/2020-07/collects/{collect_id}.json
    Removes a product from a collection

    GET /admin/api/2020-07/collects.json
    Retrieves a list of collects

    GET /admin/api/2020-07/collects/count.json
    Retrieves a count of collects

    GET /admin/api/2020-07/collects/{collect_id}.json
    Retrieves a specific collect by its ID
 */

export const getCollects = async () => {
  const result = await axios.get(`${getUrl()}/collects.json`);

  return result.data.collects;
};

export const getCollect = async (id) => {
  const result = await axios.get(`${getUrl()}/collects/${id}.json`);

  return result.data.collect;
};

export const createCollect = async (changeset) => {
  const result = await axios.post(`${getUrl()}/collects.json`, {
    collect: changeset,
  });

  return result.data.collect;
};

export const deleteCollect = async (id) => {
  const result = await axios.delete(`${getUrl()}/collects/${id}.json`);

  return result.data;
};
