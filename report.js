import CobrowseAPI from 'cobrowse-agent-sdk'
import jwt from 'jsonwebtoken'
import fs from 'fs'

// ===================== CONFIG =====================
// change these parameters to match your deployment
const API = 'https://cobrowse.io'
const email = 'user@email.com'
const licenseKey = 'xxxxxxxxx'

// The custom_data key your Genesys integration stores the conversation id under.
// Check one session's printed custom_data first and adjust if it differs.
const GENESYS_CUSTOM_DATA_KEY = 'genesys_conversation_id'

// ===================== FILTERS =====================
// Hardcode these per run.
const FROM_DATE = new Date('2026-08-01')
const TO_DATE = new Date('2026-08-21')
const GENESYS_CONVERSATION_ID = 'abc-123-genesys' // set to null to skip this filter

// =====================================================

// Generate a JWT to access the API
// IMPORTANT: generate your own private key and store it securely.
//            This is an example only, not for production use.
const privateKey = fs.readFileSync('./private-key.pem')
const token = jwt.sign({
  displayName: email,
  role: 'administrator'
}, privateKey, {
  expiresIn: '1h',
  issuer: licenseKey,
  subject: email,
  audience: 'https://cobrowse.io',
  algorithm: 'RS256'
})

// Initialise the Cobrowse Agent SDK
const cobrowse = new CobrowseAPI(token, { api: API })

// Fetch all ended sessions between `from` and `to`, optionally filtered by
// a custom_data field (e.g. genesys conversation id). Pages backwards in
// batches of 1000 so it isn't capped at a single page.
async function * listSessions (from, to, conversationId) {
  let sessions = []
  do {
    const last = sessions[sessions.length - 1]

    const query = {
      agent: 'all',
      state: 'ended',
      activated_after: from.toISOString(),
      activated_before: last?.activated || to.toISOString(),
      limit: 1000
    }

    if (conversationId) {
      query[`filter_${GENESYS_CUSTOM_DATA_KEY}`] = conversationId
    }

    sessions = await cobrowse.sessions.list(query)
    for (const session of sessions) yield session
  } while (sessions.length)
}

async function main () {
  const report = []

  for await (const session of listSessions(FROM_DATE, TO_DATE, GENESYS_CONVERSATION_ID)) {
    const device = session.device || {}
    const agent = session.agent || {}

    report.push({
      device_locale: device.device_locale,
      os_version: device.os_version,
      os_api_level: device.os_api_level,
      app_id: device.app_id,
      app_name: device.app_name,
      app_version: device.app_version,
      app_build: device.app_build,
      sdk_version: device.sdk_version,
      platform: device.platform,
      agent_name: agent.name,
      agent_email: agent.email,
      session_id: session.id,
      session_created: session.created,
      session_ended: session.ended,
      state: session.state,
      custom_data: session.custom_data
    })
  }

  console.log(`Found ${report.length} session(s)\n`)
  console.log(JSON.stringify(report, null, 2))
}

main().catch(err => {
  console.error('Error fetching session report:', err.message)
  process.exit(1)
})