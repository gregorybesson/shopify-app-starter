import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";

import { getUrl } from "../query";

dotenv.config();

/**
 *  POST /admin/api/2020-10/carrier_services.json
    Creates a carrier service

    PUT /admin/api/2020-10/carrier_services/{carrier_service_id}.json
    Updates a carrier service

    GET /admin/api/2020-10/carrier_services.json
    Retrieves a list of carrier services

    GET /admin/api/2020-10/carrier_services/{carrier_service_id}.json
    Retrieves a single carrier service

    DELETE /admin/api/2020-10/carrier_services/{carrier_service_id}.json
    Deletes a carrier service

*/

export const getCarrierServices = async () => {
  const result = await axios.get(`${getUrl()}/carrier_services.json`);

  return result.data.carrier_services;
};

export const getCarrierService = async (carrierServiceId) => {
  const result = await axios.get(
    `${getUrl()}/carrier_services/${carrierServiceId}.json`
  );

  return result.data.carrier_service;
};

export const createCarrierService = async (changeset) => {
  // changeset = {
  //   "name": "Shipping Rate Provider",
  //   "callback_url": "http://shippingrateprovider.com",
  //   "service_discovery": true
  // }
  let result = null;
  //console.log("changeset createCarrierService", changeset);

  try {
    const req = await axios.post(`${getUrl()}/carrier_services.json`, {
      carrier_service: changeset,
    });
    result = req.data;
  } catch (e) {
    console.log(
      "createCarrierService error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const updateCarrierService = async (carrierServiceId, changeset) => {
  changeset = {
    carrier_service: {
      id: carrierServiceId,
      ...changeset,
    },
  };
  const result = await axios.put(
    `${getUrl()}/carrier_services/${carrierServiceId}.json`,
    changeset
  );

  return result.data;
};

export const deleteCarrierService = async (carrierServiceId) => {
  let result = null;
  try {
    const req = await axios.delete(
      `${getUrl()}/carrier_services/${carrierServiceId}.json`
    );

    result = req.data;
  } catch (e) {
    console.log(
      "deleteCarrierService error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};
