const assert = require('assert')
const { runWPTTest } = require('./wpt.js')
const testWebsite = 'https://almanac.httparchive.org/en/2022/'

let responseData
beforeAll(async () => {
  responseData = await runWPTTest(testWebsite)
}, 400000)

test('wappalyzer successful', () => {
  assert.ok(responseData.runs['1'].firstView.wappalyzer_failed === 0)
})
