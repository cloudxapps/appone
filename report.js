import CobrowseAPI from 'cobrowse-agent-sdk';

// ===================== CONFIG =====================

// Your Agent JWT (needs 'administrator' role to list sessions for all agents)
const JWT_TOKEN = process.env.COBROWSE_JWT || 'PASTE_YOUR_AGENT_JWT_HERE';

// The custom_data key your Genesys integration stores the conversation id under.
// Check a sample session's `custom_data` output first and adjust if needed.
const GENESYS_CUSTOM_DATA_KEY = 'genesys_conversation_id';

// ===================== FILTERS =====================
// Just hardcode these values directly — change per run.

const FROM_DATE = '2026-08-01';                    // session activated on/after this date
const TO_DATE = '2026-08-21';                       // session activated before this date
const GENESYS_CONVERSATION_ID = 'abc-123-genesys';  // set to null to fetch all sessions in range, no conversation filter

// =====================================================

async function main() {
  const cobrowse = new CobrowseAPI(JWT_TOKEN);

  const query = {
    agent: 'all',   // list sessions for all agents (needs admin token)
    limit: 1000
  };

  if (FROM_DATE) query.activated_after = new Date(FROM_DATE).toISOString();
  if (TO_DATE) query.activated_before = new Date(TO_DATE).toISOString();
  if (GENESYS_CONVERSATION_ID) {
    query[`filter_${GENESYS_CUSTOM_DATA_KEY}`] = GENESYS_CONVERSATION_ID;
  }

  const sessions = await cobrowse.sessions.list(query);

  // cache agent emails so we don't look up the same agent twice
  const agentEmailCache = {};

  async function getAgentEmail(agent) {
    if (!agent || !agent.id) return undefined;
    if (agentEmailCache[agent.id] !== undefined) return agentEmailCache[agent.id];
    try {
      const user = await cobrowse.users.get(agent.id);
      agentEmailCache[agent.id] = user?.email;
    } catch (err) {
      agentEmailCache[agent.id] = undefined; // no permission / not found
    }
    return agentEmailCache[agent.id];
  }

  const report = [];

  for (const session of sessions) {
    const device = session.device || {};
    const agent = session.agent || {};

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
      agent_email: await getAgentEmail(agent),
      session_id: session.id,
      session_created: session.created,
      session_ended: session.ended,
      state: session.state,
      custom_data: session.custom_data
    });
  }

  console.log(`Found ${report.length} session(s)\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error('Error fetching session report:', err.message);
  process.exit(1);
});