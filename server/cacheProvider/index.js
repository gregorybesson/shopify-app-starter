let nodeCache = require('node-cache')
let cache = null

exports.start = function (done) {
  if (cache) return done()

  cache = new nodeCache()
  console.log('cache service started')
}

exports.instance = function () {

  return cache
}