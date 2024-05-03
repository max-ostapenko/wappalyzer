const fs = require('fs')
const { argv } = require('node:process')
const WebPageTest = require('webpagetest')

const isDirectRun = require.main === module

const wptServer = process.env.WPT_SERVER
const wptApiKey = process.env.WPT_API_KEY
const wpt = new WebPageTest(wptServer, wptApiKey)

/**
 * Runs a WebPageTest (WPT) test for a given URL.
 *
 * @param {string} url - The URL to run the test on.
 * @returns {Promise<object>} A promise that resolves with an object containing the custom metrics.
 * @throws {Error} If the test run fails or the response status code is not 200.
 */
function runWPTTest(url, metricsToLog = []) {
  const options = { key: wptApiKey, custom: '' }

  return new Promise((resolve, reject) => {
    wpt.runTestAndWait(url, options, (error, response) => {
      if (error || response.statusCode !== 200) {
        reject(error || response)
      } else {
        const technologies = {
          detected: response.data.runs['1'].firstView.detected,
          detected_apps: response.data.runs['1'].firstView.detected_apps,
          detected_technologies:
            response.data.runs['1'].firstView.detected_technologies,
          detected_raw: response.data.runs['1'].firstView.detected_raw,
        }

        fs.appendFileSync(
          'test-results.md',
          '<details>\n' +
            `<summary><strong>Custom metrics for ${url}</strong></summary>\n\n` +
            `WPT test run results: ${response.data.summary}\n` +
            (isDirectRun
              ? 'Changed custom metrics values:\n' +
                `\`\`\`json\n${JSON.stringify(technologies, null, 4)}\n\`\`\`\n`
              : '') +
            '</details>\n'
        )

        resolve(response.data)
      }
    })
  })
}

if (isDirectRun) {
  const url = argv[2]
  const metricsToLog = argv[3].split('\n')
  runWPTTest(url, metricsToLog)
}

module.exports = { runWPTTest }
