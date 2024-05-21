const assert = require('assert')
const { runWPTTest } = require('./wpt.js')
const testWebsite = 'https://almanac.httparchive.org/en/2022/'

let responseData, firstView
beforeAll(async () => {
  responseData = await runWPTTest(testWebsite)
  firstView = responseData.runs['1'].firstView
}, 400000)

test('wappalyzer successful', () => {
  assert(
    firstView.wappalyzer_failed === undefined,
    'wappalyzer_failed key is present'
  )
  assert(
    typeof firstView.detected === 'object' &&
    typeof firstView.detected_apps === 'object' &&
    typeof firstView.detected_technologies === 'object' &&
    typeof firstView.detected_raw === 'object',
    'not all technology lists are present'
  )
  assert(
    firstView.detected_raw.length > 1,
    'number of technologies detected <=1'
  )
})
