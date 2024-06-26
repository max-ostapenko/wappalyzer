const fs = require('fs')
const { argv } = require('node:process')
const WebPageTest = require('webpagetest')

const isDirectRun = require.main === module

const wptServer = process.env.WPT_SERVER
const wptApiKey = process.env.WPT_API_KEY
const PRnumber = parseInt(process.env.PR_NUMBER)

console.log(wptServer, wptApiKey, PRnumber)
const wpt = new WebPageTest(wptServer, wptApiKey)

/**
 * Runs a WebPageTest (WPT) test for a given URL.
 *
 * @param {string} url - The URL to run the test on.
 * @returns {Promise<object>} A promise that resolves with a test result JSON.
 * @throws {Error} If the test run fails or the response status code is not 200.
 */
function runWPTTest(url) {
  const options = { key: wptApiKey, wappalyzerpr: PRnumber }

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
            `<summary><strong>WPT test run for ${url}</strong></summary>\n\n` +
            `Results: ${response.data.summary}\n` +
            (isDirectRun
              ? 'Detected technologies:\n' +
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
  runWPTTest(url)
}

module.exports = { runWPTTest }
