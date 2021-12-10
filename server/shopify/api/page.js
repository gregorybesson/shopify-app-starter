import { get, put, post, del, getUrl, getHeaders, sleep } from "../query";
import _ from "lodash";

/**
 *  POST
    /admin/api/2021-10/pages.json
    Create a new Page

    GET
    /admin/api/2021-10/pages.json
    Retrieves a list of pages

    GET
    /admin/api/2021-10/pages/{page_id}.json
    Retrieves a single page by its ID

    GET
    /admin/api/2021-10/pages/count.json
    Retrieves a page count

    PUT
    /admin/api/2021-10/pages/{page_id}.json
    Updates a page

    DEL
    /admin/api/2021-10/pages/{page_id}.json
    Deletes a page
 */

/**
 *
 * @param {*} changeset
 * @returns
 */
export const createPage = async (changeset) => {
  // changeset = {
  //     "title": "Warranty information",
  //     "body_html": "\u003ch2\u003eWarranty\u003c\/h2\u003e\n\u003cp\u003eReturns accepted if we receive items \u003cstrong\u003e30 days after purchase\u003c\/strong\u003e.\u003c\/p\u003e",
  //     "handle": "warranty",
  //     "template_suffix": "",
  // }

  let result = null;
  try {
    const req = await post(`/pages.json`, {
      page: changeset,
    });
    result = req.data.page;
  } catch (e) {
    console.log(
      "createPage error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

// /admin/api/2020-07/pages/{page_id}.json
export const getPage = async (pageId) => {
  const result = await get(`/pages/${pageId}.json`);

  return result;
};
