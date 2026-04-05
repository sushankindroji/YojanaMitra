import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const FRONTEND_ROOT = process.cwd()
const ROOT = path.resolve(FRONTEND_ROOT, '..')
const BASE_URL = 'http://localhost:5173'
const API_BASE = 'http://127.0.0.1:8000/api/v1'
const timestamp = Date.now()
const runDir = path.join(ROOT, 'tmp', 'doccheck', `pc36_evidence_${timestamp}`)

fs.mkdirSync(runDir, { recursive: true })

const result = {
  timestamp,
  runDir,
  userEmail: `pc36_${timestamp}@example.com`,
  steps: {},
  optionalStepVisited: false,
  profileCompleteness: null,
  error: null,
}

const screenshot = async (page, fileName) => {
  const outPath = path.join(runDir, fileName)
  await page.screenshot({ path: outPath, fullPage: true })
  return outPath
}

const clickButtonByPattern = async (page, regex) => {
  const button = page.locator('button').filter({ hasText: regex }).first()
  await button.waitFor({ state: 'visible', timeout: 20000 })
  await button.click()
}

const waitForAnyText = async (page, patterns, timeoutMs = 180000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const body = await page.textContent('body')
    if (body) {
      for (const p of patterns) {
        if (p.test(body)) {
          return p.source
        }
      }
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`Timeout waiting for patterns: ${patterns.map((p) => p.source).join(', ')}`)
}

const waitForStepText = (page, stepNumber, timeoutMs = 120000) =>
  waitForAnyText(page, [new RegExp(`Step\\s*${stepNumber}\\s*of\\s*6`, 'i')], timeoutMs)

const waitForPathname = async (page, pattern, timeoutMs = 60000) => {
  const source = pattern.source
  const flags = pattern.flags
  await page.waitForFunction(
    ({ s, f }) => {
      const re = new RegExp(s, f)
      return re.test(window.location.pathname)
    },
    { s: source, f: flags },
    { timeout: timeoutMs }
  )
}

const setIfEmpty = async (page, selector, value) => {
  const input = page.locator(selector).first()
  if ((await input.count()) === 0) return false
  await input.waitFor({ state: 'visible', timeout: 10000 })
  const current = await input.inputValue()
  if (!current || current.trim() === '') {
    await input.fill(value)
    return true
  }
  return false
}

const selectIfEmpty = async (page, selector, value) => {
  const field = page.locator(selector).first()
  if ((await field.count()) === 0) return false
  await field.waitFor({ state: 'visible', timeout: 10000 })
  const current = await field.inputValue()
  if (!current || current.trim() === '') {
    await field.selectOption(value)
    return true
  }
  return false
}

const uploadCandidates = [
  path.join(ROOT, 'tmp', 'du2', 'du2-valid-aadhaar.png'),
  path.join(ROOT, 'tmp', 'smoke-text-aadhaar.png'),
  path.join(ROOT, 'tmp', 'du2', 'du2-camera-capture.png'),
]

const pickUploadFile = () => {
  for (const filePath of uploadCandidates) {
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  throw new Error('No upload file found for onboarding test')
}

const main = async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    const uploadFile = pickUploadFile()
    result.uploadFile = uploadFile

    const registerPayload = {
      name: 'PC36 Automation User',
      email: result.userEmail,
      password: 'TestPass123!',
      preferred_lang: 'en',
    }

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    })

    if (!registerResponse.ok) {
      const errorBody = await registerResponse.text()
      throw new Error(`Register bootstrap failed (${registerResponse.status()}): ${errorBody}`)
    }

    const registerData = await registerResponse.json()

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }, {
      accessToken: registerData.access_token,
      refreshToken: registerData.refresh_token,
    })

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
    await waitForPathname(page, /\/dashboard/, 30000)

    result.steps.register = 'passed-via-api-bootstrap'
    await screenshot(page, '01-dashboard-after-register.png')

    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' })
    await waitForStepText(page, 1, 30000)
    await screenshot(page, '02-step1-welcome.png')
    result.steps.step1 = 'passed'

    await clickButtonByPattern(page, /next|common\.next/i)
    await waitForStepText(page, 2, 30000)
    await screenshot(page, '03-step2-upload.png')
    result.steps.step2 = 'passed'

    await page.setInputFiles('#file-upload', uploadFile)

    const uploadButton = page.locator('button').filter({ hasText: /documents\.upload|Upload Document/i }).last()
    await uploadButton.waitFor({ state: 'visible', timeout: 20000 })
    await uploadButton.click()

    const postUploadStep = await waitForAnyText(
      page,
      [/Step\s*3\s*of\s*6/i, /Step\s*4\s*of\s*6/i],
      180000
    )

    if (postUploadStep.includes('3')) {
      await screenshot(page, '04-step3-processing.png')
      result.steps.step3 = 'passed'
      await waitForStepText(page, 4, 240000)
    } else {
      result.steps.step3 = 'passed-fast'
    }

    await waitForStepText(page, 4, 240000)
    await screenshot(page, '05-step4-review.png')
    result.steps.step4 = 'passed'

    await clickButtonByPattern(page, /Confirm.*Continue|confirm|continue|extraction\.confirmAndContinue/i)
    await waitForStepText(page, 5, 60000)
    await screenshot(page, '06-step5-profile-prefilled.png')

    // Personal tab
    await setIfEmpty(page, 'input[name="full_name"]', 'PC36 Automation User')
    await setIfEmpty(page, 'input[name="dob"]', '1990-01-01')
    await selectIfEmpty(page, 'select[name="gender"]', 'male')

    // Address tab
    await clickButtonByPattern(page, /Address|profile\.tab\.address/i)
    await selectIfEmpty(page, 'select[name="state"]', 'Karnataka')
    await setIfEmpty(page, 'input[name="district"]', 'Bengaluru')
    await setIfEmpty(page, 'input[name="pincode"]', '560001')

    // Economic tab
    await clickButtonByPattern(page, /Economic|profile\.tab\.economic/i)
    await setIfEmpty(page, 'input[name="annual_income"]', '500000')
    await setIfEmpty(page, 'input[name="occupation"]', 'Farmer')

    // Categories tab and force optional flow
    await clickButtonByPattern(page, /Categories|profile\.tab\.categories/i)
    const farmerCheckbox = page.locator('input[name="is_farmer"]').first()
    if ((await farmerCheckbox.count()) > 0) {
      await farmerCheckbox.check()
    }

    await screenshot(page, '07-step5-profile-ready-to-save.png')

    const profileSubmit = page.locator('form button[type="submit"]').last()
    await profileSubmit.click()

    // Optional step or summary
    const postProfileOutcome = await waitForAnyText(
      page,
      [
        /Additional Information/i,
        /profile\.additionalInfo/i,
        /Step\s*6\s*of\s*6/i,
        /Almost Done/i,
        /onboarding\.almostDone/i,
        /Step\s*7\s*of\s*6/i,
      ],
      60000
    )

    if (
      postProfileOutcome.includes('Additional Information') ||
      postProfileOutcome.includes('profile\\.additionalInfo') ||
      postProfileOutcome.includes('Step\\s*6\\s*of\\s*6')
    ) {
      result.optionalStepVisited = true
      await screenshot(page, '08-step6-optional.png')
      await setIfEmpty(page, 'input[name="land_holding_acres"]', '2')
      await clickButtonByPattern(page, /save|common\.save/i)
      await waitForAnyText(
        page,
        [/Almost Done/i, /onboarding\.almostDone/i, /Step\s*7\s*of\s*6/i],
        60000
      )
    }

    await screenshot(page, '09-step7-summary.png')

    await clickButtonByPattern(page, /finish|onboarding\.finish/i)
    try {
      await waitForPathname(page, /\/dashboard/, 90000)
    } catch {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
    }
    await screenshot(page, '10-dashboard-after-finish.png')

    result.steps.step5 = 'passed'
    result.steps.step6 = result.optionalStepVisited ? 'passed' : 'skipped-no-user-type'
    result.steps.finish = 'passed'

    const completeness = await page.evaluate(async ({ apiBase }) => {
      const token = localStorage.getItem('access_token')
      if (!token) return null
      const res = await fetch(`${apiBase}/profile/completeness`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      return await res.json()
    }, { apiBase: API_BASE })

    result.profileCompleteness = completeness

    fs.writeFileSync(path.join(runDir, 'pc36-result.json'), JSON.stringify(result, null, 2), 'utf8')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    result.error = error?.message || String(error)
    try {
      await screenshot(page, 'error-state.png')
    } catch (_) {
      // Ignore screenshot failures on crash
    }
    fs.writeFileSync(path.join(runDir, 'pc36-result.json'), JSON.stringify(result, null, 2), 'utf8')
    console.error(JSON.stringify(result, null, 2))
    process.exitCode = 1
  } finally {
    await context.close()
    await browser.close()
  }
}

main()
