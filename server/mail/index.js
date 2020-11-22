import dotenv from "dotenv";
import * as shopify from "../shopify";
import * as db from "../database";
import { Liquid } from "liquidjs";
dotenv.config();
const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

let transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    apiVersion: "2010-12-01",
  }),
});

const { SHOP } = process.env;

/**
 *
 *
 * @param {String} from
 * @param {String} to
 * @param {String} subject
 * @param {String} template
 * @param {Object} changeset
 * @param {Array} attachments
 */
export const sendMail = async (
  from,
  to,
  subject,
  template,
  changeset,
  bcc = [],
  attachments = []
) => {
  // Example of syntax for attachments
  // attachments: [
  //  {
  //    path: '/path/to/file.txt'
  //  }
  // ]

  const record = await db.getItem({ store: SHOP, sk: "settings" });
  const shop = {
    email_logo_url:
      "https://www.izac.fr/skin/frontend/rwd/default/images/logo-izac-blason.png",
    email_logo_width: "200",
    email_accent_color: "#000",
    name: "Izac",
    url: `https://${SHOP}`,
  };
  console.log("sendMail template", template);
  let snippet = await shopify.getAsset(template);
  //console.log('snippet', snippet)
  const engine = new Liquid();
  const tpl = engine.parse(snippet.asset.value);
  const html = await engine.render(tpl, { shop: shop, ...changeset });
  //console.log('html', html)
  // send welcome email
  let mailOptions = {
    from: from,
    to: to,
    bcc: bcc,
    subject: subject,
    text: "",
    html: html,
    attachments: attachments,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Message sent: ", info);
    }
  });
};
