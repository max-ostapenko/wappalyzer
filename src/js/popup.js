'use strict'
/* eslint-env browser */
/* globals chrome, Utils */

const { agent, open, i18n, getOption, setOption, promisify, sendMessage } =
  Utils

const attributeKeys = [
  'phone',
  'skype',
  'whatsapp',
  'email',
  'verifiedEmail',
  'safeEmail',
  'twitter',
  'facebook',
  'instagram',
  'github',
  'tiktok',
  'youtube',
  'pinterest',
  'linkedin',
  'owler',
  'title',
  'description',
  'copyright',
  'copyrightYear',
  'responsive',
  'schemaOrgTypes',
  'certInfo.subjectOrg',
  'certInfo.subjectCountry',
  'certInfo.subjectState',
  'certInfo.subjectLocality',
  'certInfo.issuer',
  'certInfo.protocol',
  'certInfo.validTo',
  'dns.spf',
  'dns.dmarc',
  'https',
  'trackerGoogleAnalytics',
  'trackerGoogleAdSense',
  'trackerMedianet',
  'trackerFacebook',
  'trackerOptimizely',
  'companyName',
  'inferredCompanyName',
  'industry',
  'about',
  'locations',
  'companySize',
  'companyType',
  'companyFounded',
  'employees',
]

function setDisabledDomain(enabled) {
  const el = {
    headerSwitchEnabled: document.querySelector('.header__switch--enabled'),
    headerSwitchDisabled: document.querySelector('.header__switch--disabled'),
  }

  if (enabled) {
    el.headerSwitchEnabled.classList.add('header__switch--hidden')
    el.headerSwitchDisabled.classList.remove('header__switch--hidden')
  } else {
    el.headerSwitchEnabled.classList.remove('header__switch--hidden')
    el.headerSwitchDisabled.classList.add('header__switch--hidden')
  }
}

function getCsv() {
  let hostname = ''
  let www = false
  let https = false

  try {
    let protocol = ''

    ;({ hostname, protocol } = new URL(Popup.cache.url))

    www = hostname.startsWith('www')

    https = protocol === 'https:'

    hostname = hostname.replace(/^www\./, '')
  } catch (error) {
    // Continue
  }

  const columns = [
    'URL',
    ...Popup.cache.categories.map(({ id }) =>
      chrome.i18n.getMessage(`categoryName${id}`)
    ),
    ...attributeKeys.map((key) =>
      chrome.i18n.getMessage(
        `attribute${
          key.charAt(0).toUpperCase() + key.slice(1).replace('.', '_')
        }`
      )
    ),
  ]

  const csv = [`"${columns.join('","')}"`]

  const filename = `wappalyzer${
    hostname ? `_${hostname.replace('.', '-')}` : ''
  }.csv`

  const row = [`http${https ? 's' : ''}://${www ? 'www.' : ''}${hostname}`]

  row.push(
    ...Popup.cache.categories.reduce((categories, { id }) => {
      categories.push(
        Popup.cache.detections
          .filter(({ categories }) =>
            categories.some(({ id: _id }) => _id === id)
          )
          .map(({ name }) => name)
          .join(' ; ')
      )

      return categories
    }, [])
  )

  row.push(
    ...attributeKeys.map((key) => csvEscape(Popup.cache.attributeValues[key]))
  )

  csv.push(`"${row.join('","')}"`)

  return { csv, filename }
}

function csvEscape(value = '') {
  if (Array.isArray(value)) {
    value = value
      .flat()
      .slice(0, 10)
      .map((value) => csvEscape(String(value).replace(/ ; /g, ' : ')))
      .join(' ; ')
  }

  if (typeof value === 'string') {
    return value.replace(/\n/g, ' ').replace(/"/g, '""').trim()
  }

  if (typeof value === 'boolean') {
    return String(value).toUpperCase()
  }

  if (value === null) {
    return ''
  }

  return String(value).replace(/"/g, '""')
}

const Popup = {
  /**
   * Initialise popup
   */
  async init() {
    Popup.cache = {
      url: '',
      categories: [],
      detections: [],
      attributeValues: {},
    }

    const el = {
      body: document.body,
      detections: document.querySelector('.detections'),
      empty: document.querySelector('.empty'),
      emptyReload: document.querySelector('.empty__reload'),
      footer: document.querySelector('.footer'),
      headerSwitchDisabled: document.querySelector('.header__switch--disabled'),
      headerSwitchEnabled: document.querySelector('.header__switch--enabled'),
      headerSwitches: document.querySelectorAll('.header__switch'),
      plusDownloadLink: document.querySelector(
        '.plus-download__button .button__link'
      ),
      plusDownload: document.querySelector('.plus-download'),
      tabPlus: document.querySelector('.tab--plus'),
      terms: document.querySelector('.terms'),
      termsButtonAccept: document.querySelector('.terms__button--accept'),
      termsButtonDecline: document.querySelector('.terms__button--decline'),
      headerSettings: document.querySelector('.header__settings'),
      issue: document.querySelector('.issue'),
      tabItems: document.querySelectorAll('.tab-item'),
      tabs: document.querySelectorAll('.tab'),
      templates: document.querySelectorAll('[data-template]'),
    }

    // Templates
    Popup.templates = Array.from(el.templates).reduce((templates, template) => {
      templates[template.dataset.template] = template.cloneNode(true)

      template.remove()

      return templates
    }, {})

    // Disabled domains
    const dynamicIcon = await getOption('dynamicIcon', false)

    if (dynamicIcon) {
      el.body.classList.add('dynamic-icon')
    }

    // Disabled domains
    let disabledDomains = await getOption('disabledDomains', [])

    // Terms
    const termsAccepted =
      agent === 'chrome' || (await getOption('termsAccepted', false))

    if (termsAccepted) {
      el.terms.classList.add('terms--hidden')

      Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
    } else {
      el.terms.classList.remove('terms--hidden')
      el.empty.classList.add('empty--hidden')
      el.detections.classList.add('detections--hidden')
      el.issue.classList.add('issue--hidden')
      el.footer.classList.add('footer--hidden')
      el.tabPlus.classList.add('tab--disabled')

      el.termsButtonAccept.addEventListener('click', async () => {
        await setOption('termsAccepted', true)
        await setOption('tracking', true)

        el.terms.classList.add('terms--hidden')
        el.footer.classList.remove('footer--hidden')
        el.tabPlus.classList.remove('tab--disabled')

        Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
      })

      el.termsButtonDecline.addEventListener('click', async () => {
        await setOption('termsAccepted', true)
        await setOption('tracking', false)

        el.terms.classList.add('terms--hidden')
        el.footer.classList.remove('footer--hidden')
        el.tabPlus.classList.remove('tab--disabled')

        Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
      })
    }

    let url

    const tabs = await promisify(chrome.tabs, 'query', {
      active: true,
      currentWindow: true,
    })

    if (tabs && tabs.length) {
      ;[{ url }] = tabs

      if (url.startsWith('http')) {
        Popup.cache.url = url

        const { hostname } = new URL(url)

        setDisabledDomain(disabledDomains.includes(hostname))

        el.headerSwitchDisabled.addEventListener('click', async () => {
          disabledDomains = disabledDomains.filter(
            (_hostname) => _hostname !== hostname
          )

          await setOption('disabledDomains', disabledDomains)

          setDisabledDomain(false)

          Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
        })

        el.headerSwitchEnabled.addEventListener('click', async () => {
          disabledDomains.push(hostname)

          await setOption('disabledDomains', disabledDomains)

          setDisabledDomain(true)

          Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
        })
      } else {
        for (const headerSwitch of el.headerSwitches) {
          headerSwitch.classList.add('header__switch--hidden')
        }

        el.tabPlus.classList.add('tab--disabled')
      }
    }

    // Header
    el.headerSettings.addEventListener('click', () =>
      chrome.runtime.openOptionsPage()
    )

    // Tabs
    el.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        el.tabs.forEach((tab) => tab.classList.remove('tab--active'))
        el.tabItems.forEach((item) => item.classList.add('tab-item--hidden'))

        tab.classList.add('tab--active')
        el.tabItems[index].classList.remove('tab-item--hidden')

        el.plusDownload.classList.remove('plus-download--hidden')
        el.footer.classList.remove('footer--hidden')
      })
    })

    // Download
    el.plusDownloadLink.addEventListener('click', Popup.downloadCsv)

    Array.from(document.querySelectorAll('a[href^="http"]')).forEach((a) => {
      a.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()

        const { version } = chrome.runtime.getManifest()

        open(
          a.href
            .replace(/__URL__/g, url)
            .replace(/__VERSION__/g, version)
            .replace(/__AGENT__/g, agent)
        )

        return false
      })
    })

    // Reload
    el.emptyReload.addEventListener('click', (event) => {
      chrome.tabs.reload({ bypassCache: true })
    })

    // Apply internationalization
    i18n()

    Popup.cache.categories = await Popup.driver('getCategories')
  },

  driver(func, args) {
    return sendMessage('popup.js', func, args)
  },

  /**
   * Log debug messages to the console
   * @param {String} message
   */
  log(message) {
    Popup.driver('log', message)
  },

  /**
   * Group technologies into categories
   * @param {Object} technologies
   */
  categorise(technologies) {
    return Object.values(
      technologies
        .filter(({ confidence }) => confidence >= 50)
        .reduce((categories, technology) => {
          technology.categories.forEach((category) => {
            categories[category.id] = categories[category.id] || {
              ...category,
              technologies: [],
            }

            categories[category.id].technologies.push(technology)
          })

          return categories
        }, {})
    )
  },

  /**
   * Callback for getDetection listener
   * @param {Array} detections
   */
  async onGetDetections(detections = []) {
    Popup.cache.detections = detections

    const el = {
      empty: document.querySelector('.empty'),
      detections: document.querySelector('.detections'),
      issue: document.querySelector('.issue'),
      plusDownload: document.querySelector('.plus-download'),
    }

    detections = (detections || [])
      .filter(({ confidence }) => confidence >= 50)
      .filter(({ slug }) => slug !== 'cart-functionality')

    if (!detections || !detections.length) {
      el.empty.classList.remove('empty--hidden')
      el.detections.classList.add('detections--hidden')
      el.issue.classList.add('issue--hidden')
      el.plusDownload.classList.add('plus-download--hidden')

      return
    }

    el.empty.classList.add('empty--hidden')
    el.detections.classList.remove('detections--hidden')
    el.issue.classList.remove('issue--hidden')
    el.plusDownload.classList.remove('plus-download--hidden')

    let firstChild

    while ((firstChild = el.detections.firstChild)) {
      if (firstChild instanceof Node) {
        el.detections.removeChild(firstChild)
      }
    }

    const pinnedCategory = await getOption('pinnedCategory')

    const categorised = Popup.categorise(detections)

    categorised.forEach(({ id, name, slug: categorySlug, technologies }) => {
      const categoryNode = Popup.templates.category.cloneNode(true)

      const el = {
        detections: document.querySelector('.detections'),
        link: categoryNode.querySelector('.category__link'),
        pins: categoryNode.querySelectorAll('.category__pin'),
        pinsActive: document.querySelectorAll('.category__pin--active'),
      }

      el.link.href = `https://www.wappalyzer.com/technologies/${categorySlug}/?utm_source=popup&utm_medium=extension&utm_campaign=wappalyzer`
      el.link.dataset.i18n = `categoryName${id}`

      if (pinnedCategory === id) {
        el.pins.forEach((pin) => pin.classList.add('category__pin--active'))
      }

      el.pins.forEach((pin) =>
        pin.addEventListener('click', async () => {
          const pinnedCategory = await getOption('pinnedCategory')

          el.pinsActive.forEach((pin) =>
            pin.classList.remove('category__pin--active')
          )

          if (pinnedCategory === id) {
            await setOption('pinnedCategory', null)
          } else {
            await setOption('pinnedCategory', id)

            el.pins.forEach((pin) => pin.classList.add('category__pin--active'))
          }
        })
      )

      technologies.forEach(
        ({ name, slug, confidence, version, icon, website }) => {
          const technologyNode = Popup.templates.technology.cloneNode(true)

          const el = {
            technologies: categoryNode.querySelector('.technologies'),
            iconImage: technologyNode.querySelector('.technology__icon img'),
            link: technologyNode.querySelector('.technology__link'),
            name: technologyNode.querySelector('.technology__name'),
            version: technologyNode.querySelector('.technology__version'),
            confidence: technologyNode.querySelector('.technology__confidence'),
          }

          el.iconImage.src = `../images/icons/${icon}`

          el.link.href = `https://www.wappalyzer.com/technologies/${categorySlug}/${slug}/?utm_source=popup&utm_medium=extension&utm_campaign=wappalyzer`
          el.name.textContent = name

          if (confidence < 100) {
            el.confidence.textContent = `${confidence}% sure`
          } else {
            el.confidence.remove()
          }

          if (version) {
            el.version.textContent = version
          } else {
            el.version.remove()
          }

          el.technologies.appendChild(technologyNode)
        }
      )

      el.detections.appendChild(categoryNode)
    })

    if (categorised.length === 1) {
      el.detections.appendChild(Popup.templates.category.cloneNode(true))
    }

    Array.from(document.querySelectorAll('a')).forEach((a) =>
      a.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()

        open(a.href)

        return false
      })
    )

    i18n()
  },

  async downloadCsv(event) {
    event.preventDefault()

    const { csv, filename } = getCsv()

    const file = URL.createObjectURL(
      new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' })
    )

    const granted = await promisify(chrome.permissions, 'request', {
      permissions: ['downloads'],
    })

    if (granted) {
      chrome.downloads.download({
        url: file,
        filename,
      })
    }

    return false
  },
}

if (/complete|interactive|loaded/.test(document.readyState)) {
  Popup.init()
} else {
  document.addEventListener('DOMContentLoaded', Popup.init)
}
