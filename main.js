const request = require('./request');

const GENESYS_REGION = 'mypurecloud.com';
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const CONVERSATION_ID = 'YOUR_CONVERSATION_ID';

// ---- 1. Get Token -----------------------------------------------------
async function getGenesysToken() {
  const authHeader = Buffer.from('${CLIENT_ID}:${CLIENT_SECRET}').toString('base64');
  const tokenUrl = 'https://login.${GENESYS_REGION}/oauth/token';

  const result = await request(
    'POST',
    tokenUrl,
    'grant_type=client_credentials', // form-urlencoded body, sent as raw string
    {
      Authorization: 'Basic ${authHeader}',
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  );

  return result.access_token;
}

// ---- 2. Get Conversation / Call Details --------------------------------
async function getConversationDetails(token, conversationId) {
  const url = 'https://api.${GENESYS_REGION}/api/v2/conversations/${conversationId}';
  return request('GET', url, null, {
    Authorization: 'Bearer ${token}',
  });
}

// ---- 3. Get Customer Participant ID -----------------------------------
// Genesys does not expose a separate "/participants" list endpoint for this;
// participants (including the customer) are embedded in the conversation
// details payload under 'participants[]', each with a 'purpose' field
// (e.g. 'customer', 'agent', 'acd', 'ivr').
async function getCustomerParticipantId(conversationDetails) {
  const participants = conversationDetails.participants || [];
  const customer = participants.find((p) => p.purpose === 'customer');

  if (!customer) {
    throw new Error('No participant with purpose "customer" found on this conversation.');
  }

  return customer.id;
}

// ---- 3.1 Set Attribute on Customer Participant -------------------------
// PATCH /api/v2/conversations/{conversationId}/participants/{participantId}/attributes
// Body is a flat map of attribute key/value pairs to merge onto the participant.

async function setParticipantAttributes(token, conversationId, participantId, attributes) {
  const url = 'https://api.${GENESYS_REGION}/api/v2/conversations/${conversationId}/participants/${participantId}/attributes';

  return request('PATCH', url, attributes, {
    Authorization: 'Bearer ${token}',
  });
}

// ---- Main ---------------------------------------------------------------
async function main() {
  let token;
  try {
    token = await getGenesysToken();
    console.log('Genesys Token acquired.');
  } catch (err) {
    console.log('Get Token failed:', err.message);
    return; // nothing else can proceed without a token
  }

  let conversationDetails;
  try {
    conversationDetails = await getConversationDetails(token, CONVERSATION_ID);
    console.log('GET conversation ${CONVERSATION_ID}:');
    console.log(conversationDetails);
  } catch (err) {
    console.log('Get Conversation Details failed:', err.message);
    return;
  }

  let customerParticipantId;
  try {
    customerParticipantId = await getCustomerParticipantId(conversationDetails);
    console.log('Customer Participant ID:', customerParticipantId);
  } catch (err) {
    console.log('Get Customer Participant ID failed:', err.message);
    return;
  }

  try {
    const attributesToSet = {
      // example custom attributes — replace with your real key/value pairs
      caseId: '12345',
      priority: 'high',
    };
    const setResult = await setParticipantAttributes(
      token,
      CONVERSATION_ID,
      customerParticipantId,
      attributesToSet
    );
    console.log('Set Participant Attributes result:', setResult);
  } catch (err) {
    console.log('Set Participant Attributes failed:', err.message);
  }
}

main();
