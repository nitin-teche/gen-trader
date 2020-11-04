const Processor = require('./processor')
const fs = require('fs');
const csv = require('csv-parser');

const inputFilePath = 'btc_30_oct_2020.csv'
const emaMinPeriod = 12
const emaMaxPeriod = 26
const emaSmoothing = 2
const rsiPeriod = 14
let balance = 100, equity = 0
let msgFlag = true
let i = 0, interval = 1
startCsvBackTesting()

async function startCsvBackTesting() {
    let testDataSet = []
    try {
        console.log('Backtesting on BTC Data..')
        fs.createReadStream(inputFilePath)
            .pipe(csv())
            .on('data', function (data) {
                try {
                    if(i%interval == 0){
                        if(data.price) testDataSet.push({'close':parseFloat(data.price)})
                    }
                    i++
                } catch (err) {
                    console.error(err)
                }
            })
            .on('end', function () {
                console.log('Dataset created..')
                backTesting(testDataSet)
            });
    } catch (error) {
        console.log(error)
    }
}

async function backTesting(testDataSet){
    console.log('Initializing Processor..')
    const processor = new Processor(testDataSet[0].close, emaMinPeriod, emaMaxPeriod, emaSmoothing, rsiPeriod)
    testDataSet.splice(0, 1);
    testDataSet.filter((data) => data)
    testDataSet.forEach(marketData => {
        if(processor.isInitialized()){
            if(msgFlag){
                console.log('Processor Initialized..')
                msgFlag = false
            }
            const signalResponse = processor.generateSignal(marketData)
            if (signalResponse.signal == 1 && balance > 0) {
                equity = balance / signalResponse.price
                console.log('Bought Qty:' + equity + ' Price:' + signalResponse.price + ' Balance:' + balance)
                balance = 0
            } else if (signalResponse.signal == 2 && equity > 0) {
                balance = equity * signalResponse.price
                console.log('Sold Qty:' + equity + ' Price:' + signalResponse.price + ' Balance:' + balance)
                equity = 0
            } else {
                //console.log('--------<SKIP>--------')
            }
        }else{
            processor.feed(marketData)
        }
    });
}