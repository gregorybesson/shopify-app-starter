import crypto from 'crypto'
import dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_API_SECRET } = process.env;

export const validateSignature = query => {
    var parameters = [];
    for (var key in query) {
      if (key != 'signature') {
        parameters.push(key + '=' + query[key])
      }
    }
    var message = parameters.sort().join('');
    var digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(message).digest('hex');
    return digest === query.signature;
};