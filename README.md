# Introduction
This starter is based on https://github.com/Shopify/shopify-app-node

The technos used are :
- Node
- Next.JS
- Koa
- React
- Polaris (Shopify)

It contains ready to use services to make the dev of your shopify app fast and easy :
- mail service : You can send mails and use liquid files from the shopify store as templates
- CRON service : You can CRON whatever service you need
- Full Shopify API : REST + GraphQL, including REST and GQL pagination and GQL batches
- S3 service : You can save or get any file on a S3 share (import images, export a catalog of products...)
- DynamoDB database : We keep the permanent token + stores by default and you can use it to extend the schema to persist whatever you need
- Cache service : very useful if you need to cache rarely written data / frequently read data like a products collection filter or whatever

/\ Important /\
This starter uses a customized version of shopify-app-cli and authenticates the logged in user through Shopify : It will only use the permanent token for CRON by default.
This way, you may check the users's rights and identify him. If you want to use the permanent token, you may do it through the db service.

# Installation
Clone the starter then npm i

# Develop
start the server
`PORT=8081 npm run dev`

Then open a tunnel with ngrok (I advise to use a subdomain to always keep the same URL while you develop day to day):
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

# Steps to develop a new app
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

You're good to go

# Dev this starter
## test the auth offline/online
1. When installing the app for the first time, the app will create the offline session first then the online session of the user. To reproduce this step: remove the app from your shopify store and delete the entry in your dynamoDB instance.

