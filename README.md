# Introduction
This starter is based on https://github.com/Shopify/shopify-app-node

The technos used are :
- Node
- Next.JS
- Koa
- React
- Polaris (Shopify)

## Main changes introduced in this starter compared to the original shopify-app-node
- I use my own fork of [koa-shopify-auth](https://github.com/Shopify/koa-shopify-auth) to handle the possibility to auth with online or offline accessMode (see https://github.com/gregorybesson/koa-shopify-auth for more details). I'll reuse the original one as soon as my PR will be accepted.
- Thanks to the previous fork, I've added a way to handle offline and online accessMode:
  - During the very first installation, we force the offline mode to grab the offline token: This will be useful for the CRON functions needing to access Shopify
  - It then use the online token so that we may adapt the autorizations to the online user rights
- The the react component support used in the origianl pages/_app.js ended in March 2020. I've replaced it with @apollo/client (see https://github.com/Shopify/shopify-app-node/issues/555)
- The session Storage is DynamoDB in this starter.
-

## New features
The stazrter contains ready to use services to make the dev of your shopify app fast and easy :
- mail service : You can send mails and use *liquid files* from the shopify store as templates
- CRON service : You can CRON whatever service you need
- Full Shopify API : REST + GraphQL, including REST and GQL pagination and GQL batches
- S3 service : You can save or get any file on a S3 share (import images, export a catalog of products...)
- DynamoDB database : We keep the permanent token + stores by default and you can use it to extend the schema to persist whatever you need
- Cache service : very useful if you need to cache rarely written data / frequently read data like a products collection filter or whatever

# Installation
1. Clone the starter then npm i
2. Create your .env file
3. Create your .shopify-cli.yml file (so that you may use `shopify node serve`)

# Develop
start the server

## Shopify-cli
`shopify node serve`

## Manually
`PORT=8081 npm run dev`

Then open a tunnel with ngrok (I advise to use a subdomain (You'll have to pay a ngrok subscription for it) to always keep the same URL while you develop day to day):
`ngrok http 8081 --subdomain=livingcolor`

# Build and deploy
Build the nextJS files
`npm run build`

# Architecture
All of your devs should take place in the app directory or pages

## app
Under this directory, you may
- add CRON jobs in cron/index.js
- customize code in webhooks in routes/webhooksRouter
- Add new routes : Create a Router file (take inspiration from webhooksRouter) and import it in routes/index.js
- Create an API module : Create a directory and export your methods

## pages
This directory is dedicated to your nextJS pages appearing in the Shoify's BO Iframe

# Steps to develop a new app for a Shopify store
1. clone this repo
2. Go on your Shopify's partner page and create an app : https://www.shopify.com/partners
   1. use a https ngrok domain like lc-mydemo.ngrok.io
   2. use the preferences link https://lc-mydemo.ngrok.io/preferences
   3. use the redirection https://lc-mydemo.ngrok.io/auth/callback
   4. Note the API key and secret
3. enter the api key and secret key in your .env file
4. copy .env.dist to .env and change your .env parameters accordingly (DATABASE, HOST, S3BUCKET, ...)
5. Start the server `PORT=8088 npm run dev` then launch your ngrok tunnel `ngrok http 8088 --subdomain=lc-mydemo`
6. Install the app using the link on your partner's app webpage

You're good to go :rocket:

# Dev this starter
## test the auth offline/online
1. When installing the app for the first time, the app will first create the dyanmo table (using your .env variable `DATABASE` and will create the offline session first then the online session of the user. To reproduce this step: remove the app from your shopify store and delete the entry in your dynamoDB instance or even the database.

