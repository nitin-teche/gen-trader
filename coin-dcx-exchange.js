const { rejects } = require('assert')
const { resolve } = require('path')
const request = require('request')

var apiBaseUrl = "https://api.coindcx.com"
var publicBaseUrl = "https://public.coindcx.com"

exports.getTicker = (marketPair) => {
    return new Promise((resolve,reject) => {
        request.get(apiBaseUrl + "/exchange/ticker", function (error, response, body) {
            if(error) resolve(false)
            if(!response || response.statusCode != 200) resolve(false)
            if(!body || body.length == 0 || body == undefined || body == 'undefined') resolve(false)
            try {
                let ticker = JSON.parse(body)
                let currMarketData = ticker.find((record) => {
                    return record.market == marketPair
                })
                resolve(currMarketData)
            } catch (err) {
                resolve(false)
            }
        })
    })
}

exports.getCandles = (marketPair,interval,limit = 1) => {
    return new Promise((resolve,reject) => {
        let apiUrl = publicBaseUrl + "/market_data/candles?pair="+marketPair+"&interval="+interval+"&limit="+limit
        request.get(apiUrl,function(error, response, body) {
            if(error) resolve(false)
            if(!response || response.statusCode != 200) resolve(false)
            if(!body || body.length == 0 || body == undefined || body == 'undefined') resolve(false)
            try {
                let data = (limit == 1) ? JSON.parse(body)[0] : JSON.parse(body)
                resolve(data)
            } catch(err) {
                resolve(false)
            }
        })
    })
}