const { sign } = require("crypto")

const SIGNAL_HOLD = 0,SIGNAL_BUY = 1,SIGNAL_SELL = 2
const PRICE_GAIN = 1,PRICE_LOSS = 2
module.exports = class Processor {
    constructor(price,emaMinPeriod,emaMaxPeriod,emaSmoothing,rsiPeriod){
        this.macdInitialized = false
        this.rsiInitialized = false
        this.emaMinPeriod = emaMinPeriod
        this.emaMaxPeriod = emaMaxPeriod
        this.emaSmoothing = emaSmoothing
        this.rsiPeriod = rsiPeriod
        this.emaMacdPeriod = 9
        this.marketPairData = [{
            'price' : price,
            'smaMin' : null,
            'smaMax' : null,
            'emaMin' : null,
            'emaMax' : null,
            'macd' : null,
            'emaMacd' : null,
            'emaMacdDiff' : null,
            'sma9' : null,
            'gain' : null,
            'loss' : null,
            'avgGain' : null,
            'avgLoss' : null,
            'rs' : null,
            'rsi' : null
        }]
    }

    generateSignal(data){
        let lastData = this.marketPairData[this.marketPairData.length-1]
        let newData = this.calculateIndicators(data,lastData)
        this.marketPairData.push(newData)
        if(this.isInitialized()){
            this.marketPairData.splice(0,1);
            this.marketPairData.filter((data) => data)
        }
        let signal = this.tradeStrategyThree(newData,lastData)
        //console.log('price:'+newData.price+' emaMacdDiff:'+newData.emaMacdDiff+' sma9:'+newData.sma9+' rsi:'+newData.rsi+' signal:'+(signal == 1 ? 'Buy' : 'Sell'))
        return {'signal':signal,'price':newData.price}
    }

    feed(data){
        let lastData = this.marketPairData[this.marketPairData.length-1]
        let pairData = this.calculateIndicators(data,lastData)
        //console.log('price:'+pairData.price+' emaMacdDiff:'+pairData.emaMacdDiff+' sma9:'+pairData.sma9)
        //console.log('price:'+pairData.price+' gain:'+pairData.gain+' loss:'+pairData.loss+' avgGain:'+pairData.avgGain+' avgLoss:'+pairData.avgLoss+' rs:'+pairData.rs+' rsi:'+pairData.rsi)
        this.marketPairData.push(pairData)
        if(this.isInitialized()){
            this.marketPairData.splice(0,1);
            this.marketPairData.filter((data) => data)
        }
    }

    calculateIndicators(data,lastRecord){
        let price = data.close
        let sma9 = this.sma(9)
        let macdData = this.macd(price,lastRecord)
        let rsi = this.rsi(price,lastRecord)
        return {
            'price' : price,
            'smaMin' : macdData.smaMin,
            'smaMax' : macdData.smaMax,
            'emaMin' : macdData.emaMin,
            'emaMax' : macdData.emaMax,
            'macd' : macdData.macd,
            'emaMacd' : macdData.emaMacd,
            'emaMacdDiff' : macdData.emaMacdDiff,
            'sma9' : sma9,
            'gain' : rsi.gain,
            'loss' : rsi.loss,
            'avgGain' : rsi.avgGain,
            'avgLoss' : rsi.avgLoss,
            'rs' : rsi.rs,
            'rsi' : rsi.rsi
        }
    }

    isInitialized(){
        return this.macdInitialized && this.rsiInitialized
    }

    macd(price,lastRecord){
        let emaMinPrev = null,emaMaxPrev = null,smaMin = null,smaMax = null,emaMacdDiff = null
        let emaMin = null,emaMax = null,macd = null,emaMacdPrev = null,emaMacd = null
        if(this.marketPairData.length >= this.emaMinPeriod){
            smaMin = this.smaMin()
            if(lastRecord.emaMin == null){
                emaMinPrev = smaMin
            }else{
                emaMinPrev = lastRecord.emaMin
            }
            emaMin = this.emaMin(price,emaMinPrev)
        }
        if(this.marketPairData.length >= this.emaMaxPeriod){
            smaMax = this.smaMax()
            if(lastRecord.emaMax == null){
                emaMaxPrev = smaMax
            }else{
                emaMaxPrev = lastRecord.emaMax
            }
            emaMax = this.emaMax(price,emaMaxPrev)
        }
        if(emaMin != null && emaMax != null){
            macd = this.roundToFour(emaMin-emaMax)
        }
        if(this.emaMacdPeriodCompleted()){
            if(lastRecord.emaMacd == null){
                emaMacdPrev = this.smaMacd()
            }else{
                emaMacdPrev = lastRecord.emaMacd
            }
            emaMacd = this.emaMacd(macd,emaMacdPrev)
            emaMacdDiff = this.roundToFour(macd-emaMacd)
            this.macdInitialized = true
        }
        return {
            'smaMin' : smaMin,
            'smaMax' : smaMax,
            'emaMin' : emaMin,
            'emaMax' : emaMax,
            'macd' : macd,
            'emaMacd' : emaMacd,
            'emaMacdDiff' : emaMacdDiff
        }
    }

    smaMin(){
        let totalPrice = 0;
        for(let i= this.marketPairData.length-1;i > this.marketPairData.length-this.emaMinPeriod-1;i--){
            totalPrice += this.marketPairData[i].price
        }
        return this.roundToFour(totalPrice/this.emaMinPeriod)
    }

    smaMax(){
        let totalPrice = 0;
        for(let i= this.marketPairData.length-1;i > this.marketPairData.length-this.emaMaxPeriod-1;i--){
            totalPrice += this.marketPairData[i].price
        }
        return this.roundToFour(totalPrice/this.emaMaxPeriod)
    }

    sma(period){
        let sma = null;
        if(this.marketPairData.length >= period){
            let totalPrice = 0;
            for(let i= this.marketPairData.length-1;i > this.marketPairData.length-period-1;i--){
                totalPrice += this.marketPairData[i].price
                sma = this.roundToFour(totalPrice/period)
            }
        }
        return sma
    }

    emaMin(currPrice,emaPrev){
        let val = (currPrice*(this.emaSmoothing/(1+this.emaMinPeriod)))
        +(emaPrev*(1-(this.emaSmoothing/(1+this.emaMinPeriod))))
        return this.roundToFour(val)
    }

    emaMax(currPrice,emaPrev){
        let val = (currPrice*(this.emaSmoothing/(1+this.emaMaxPeriod)))
        +(emaPrev*(1-(this.emaSmoothing/(1+this.emaMaxPeriod))))
        return this.roundToFour(val)
    }

    roundToFour(num) {    
        return +(Math.round(num + "e+4")  + "e-4");
    }

    emaMacdPeriodCompleted(){
        let idx = this.marketPairData.length - this.emaMacdPeriod
        return this.marketPairData[idx] && this.marketPairData[idx].macd !== null ? true: false
    }

    smaMacd(){
        let total = 0;
        for(let i= this.marketPairData.length-1;i > this.marketPairData.length-this.emaMacdPeriod-1;i--){
            total += this.marketPairData[i].macd
        }
        return this.roundToFour(total/this.emaMacdPeriod)
    }

    emaMacd(currVal,emaPrev){
        let val = (currVal*(this.emaSmoothing/(1+this.emaMacdPeriod)))
        +(emaPrev*(1-(this.emaSmoothing/(1+this.emaMacdPeriod))))
        return this.roundToFour(val)
    }

    rsi(price,lastRecord){
        let gain = 0,loss = 0,avgGain = 0,avgLoss = 0,rs = 0,rsi = 0
        if(price > lastRecord.price) gain = this.roundToFour(price-lastRecord.price)
        if(price < lastRecord.price) loss = this.roundToFour(lastRecord.price-price)
        if(this.marketPairData.length > this.rsiPeriod){
            if(this.marketPairData.length == this.rsiPeriod+1){
                avgGain = this.initialPriceAverage(PRICE_GAIN)
                avgLoss = this.initialPriceAverage(PRICE_LOSS)
            }else{
                avgGain = this.priceAverage(PRICE_GAIN,lastRecord,gain)
                avgLoss = this.priceAverage(PRICE_LOSS,lastRecord,loss)
            }
            rs = this.roundToFour(avgGain/avgLoss)
            rsi = this.roundToFour(100-(100/(1+rs)))
            this.rsiInitialized = true
        }
        return {
            'gain' : gain,
            'loss' : loss,
            'avgGain' : avgGain,
            'avgLoss' : avgLoss,
            'rs' : rs,
            'rsi' : rsi
        }
    }

    initialPriceAverage(type){
        let total = 0;
        for(let i= this.marketPairData.length-1;i > this.marketPairData.length-this.rsiPeriod-1;i--){
            total += type == PRICE_GAIN ? this.marketPairData[i].gain : this.marketPairData[i].loss
        }
        return this.roundToFour(total)
    }

    priceAverage(type,lastRec,currVal){
        return type == PRICE_GAIN ? this.roundToFour(((lastRec.avgGain*13)+currVal)/this.rsiPeriod) : this.roundToFour(((lastRec.avgLoss*13)+currVal)/this.rsiPeriod)
    }

    // entry : positive macd, new macd > last macd, new sma9 > last sma9
    // exit : negative macd OR new macd < last macd OR new sma9 < last sma9
    tradeStrategyOne(newRec,lastRec){
        let signal = SIGNAL_SELL
        if(newRec.emaMacdDiff >= 0 && newRec.emaMacdDiff >= lastRec.emaMacdDiff){
            if(newRec.sma9 > lastRec.sma9){
                signal = SIGNAL_BUY
            }
        }
        return signal
    }

    // entry : positive macd, new sma9 > last sma9
    // exit : negative macd OR new sma9 < last sma9
    tradeStrategyTwo(newRec,lastRec){
        let signal = SIGNAL_SELL
        if(newRec.emaMacdDiff >= 0 && newRec.sma9 > lastRec.sma9){
            signal = SIGNAL_BUY
        }
        return signal
    }

    // entry : new macd > last macd, new rsi > last rsi
    // exit : new macd < last macd OR new rsi < last rsi
    tradeStrategyThree(newRec,lastRec){
        let signal = SIGNAL_HOLD
        if(newRec.emaMacdDiff > lastRec.emaMacdDiff && newRec.rsi > lastRec.rsi){
            signal = SIGNAL_BUY
        }
        if(newRec.rsi < lastRec.rsi && newRec.price < lastRec.price){
            signal = SIGNAL_SELL
        }
        return signal
    }
}