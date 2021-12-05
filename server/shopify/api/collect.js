import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { get, put, post, del, getUrl, getNextPage } from "../query";

dotenv.config();

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
  const result = await get(`/collects.json`);

  return result.data.collects;
};

export const getCollect = async (id) => {
  const result = await get(`/collects/${id}.json`);

  return result.data.collect;
};

export const createCollect = async (changeset) => {
  const result = await post(`/collects.json`, {
    collect: changeset,
  });

  return result.data.collect;
};

export const deleteCollect = async (id) => {
  const result = await del(`/collects/${id}.json`);

  return result.data;
};
