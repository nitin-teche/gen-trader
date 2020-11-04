const exchange = require('./coin-dcx-exchange')
const Processor = require('./processor')

const marketPairs = {
  'LINKUSDT' : 'B-LINK_USDT',
  'BTCUSDT' : 'B-BTC_USDT',
  'UNIUSDT' : 'B-UNI_USDT',
  'ETHUSDT' : 'B-ETH_USDT'
}
const tradeInMarketPair = marketPairs.BTCUSDT
const interval = 1000*60*5
const timeFrame = '5m'
const emaMinPeriod = 12
const emaMaxPeriod = 26
const emaSmoothing = 2
const rsiPeriod = 14
let balance = 100
let equity = 0

startTrader()

async function startTrader(){
  try{
    console.log('Trading '+tradeInMarketPair+' with interval '+interval)
    let initialDataSet = await exchange.getCandles(tradeInMarketPair,timeFrame,50)
    if(!initialDataSet){
      return startTrader()
    }
    initialDataSet.reverse()
    console.log('Initializing Processor..')
    const processor = new Processor(initialDataSet[0].close,emaMinPeriod,emaMaxPeriod,emaSmoothing,rsiPeriod)
    initialDataSet.splice(0,1);
    initialDataSet.filter((data) => data)
    initialDataSet.forEach(marketData => {
      processor.feed(marketData)
    });
    console.log('Processor Initialized..')
    setInterval(() => {
      processMarketData(processor)
    }, interval);
  }catch(error){
    console.log(error)
  }
}

async function processMarketData(processor){
  try{
    let marketData = await exchange.getCandles(tradeInMarketPair,timeFrame)
    if(!marketData) return false
    const signalResponse = processor.generateSignal(marketData)
    if(signalResponse.signal == 1 && balance > 0){
      equity = balance/signalResponse.price
      console.log('Bought Qty:'+equity+' Price:'+signalResponse.price+' Balance:'+balance)
      balance = 0
    }else if(signalResponse.signal == 2 && equity > 0){
      balance = equity * signalResponse.price
      console.log('Sold Qty:'+equity+' Price:'+signalResponse.price+' Balance:'+balance)
      equity = 0
    }else{
      //console.log('--------<SKIP>--------')
    }
  }catch(error){
    console.log(error)
  }
}