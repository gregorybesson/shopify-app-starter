import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

export const uploadImages = async (sources) => {
  sources = {
    input: [
      {
        filename: "image1.jpg",
        mimeType: "image/jpg",
        resource: "IMAGE",
      },
      {
        filename: "image2.jpg",
        mimeType: "image/jpg",
        resource: "IMAGE",
      },
    ],
  };
  const query = {
    query: `mutation generateStagedUploads($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
    variables: sources,
  };

  let result = null;
  try {
    const req = await axios.post(`${getUrl()}/graphql.json`, query);
    console.log("req", req.data);
    result = req.data;
  } catch (e) {
    console.log(
      "uploadImages error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};
