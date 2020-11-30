import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";

import { get, put, post, del, getUrl } from "../query";

dotenv.config();

/**
 *  GET /admin/api/2020-10/users.json
    Retrieves a list of all users

    GET /admin/api/2020-10/users/{user_id}.json
    Retrieves a single user

    GET /admin/api/2020-10/users/current.json
    Retrieves the currently logged-in user
*/

export const getUsers = async () => {
  const result = await get(`/users.json`);

  return result.data.users;
};

export const getUser = async (userId) => {
  const result = await get(`/users/${userId}.json`);

  return result.data.user;
};

export const getCurrentUser = async () => {
  //const result = await get(`/users/current.json`);
  const result = await get(`/users/current.json`);

  return result.data.user;
};
