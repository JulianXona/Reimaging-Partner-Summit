// api/responses.js - Vercel Serverless Function

const STORAGE_KEY = 'dkc_responses';
const SESSION_KEY = 'dkc_session';

// Busca la URL REST de Upstash (debe empezar con https://)
function getRestUrl() {
  const candidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.KV_REST_API_URL,
  ];
  return candidates.find(u => u && u.startsWith('https://'));
}

function getRestToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN
  );
}

async function kvGet(key) {
  const url = getRestUrl();
  const token = getRestToken();
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const url = getRestUrl();
  const token = getRestToken();
  const encoded = encodeURIComponent(JSON.stringify(value));
  await fetch(`${url}/set/${key}/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const responses = await kvGet(STORAGE_KEY) || [];
      const session = await kvGet(SESSION_KEY) || { open: true };
      return res.json({ responses, session });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

      if (action === 'submit') {
        const session = await kvGet(SESSION_KEY) || { open: true };
        if (!session.open) return res.json({ ok: false, error: 'Sesión cerrada' });

        const responses = await kvGet(STORAGE_KEY) || [];
        const { participantId, name, deleteText, keepText, createText } = payload;

        const existing = responses.findIndex(r => r.participantId === participantId);
        const entry = {
          participantId,
          name,
          deleteText,
          keepText,
          createText,
          submittedAt: new Date().toISOString(),
          version: existing >= 0 ? (responses[existing].version || 1) + 1 : 1
        };

        if (existing >= 0) responses[existing] = entry;
        else responses.push(entry);

        await kvSet(STORAGE_KEY, responses);
        return res.json({ ok: true, entry });
      }

      if (action === 'vote') {
        const responses = await kvGet(STORAGE_KEY) || [];
        const { participantId, targetId, field, type } = payload;
        const target = responses.find(r => r.participantId === targetId);
        if (!target) return res.json({ ok: false });

        if (!target.votes) target.votes = {};
        const vKey = `${field}_${type}`;
        if (!target.votes[vKey]) target.votes[vKey] = [];

        const idx = target.votes[vKey].indexOf(participantId);
        if (idx >= 0) target.votes[vKey].splice(idx, 1);
        else target.votes[vKey].push(participantId);

        await kvSet(STORAGE_KEY, responses);
        return res.json({ ok: true });
      }

      if (action === 'session') {
        const { open } = payload;
        await kvSet(SESSION_KEY, { open, updatedAt: new Date().toISOString() });
        return res.json({ ok: true });
      }

      if (action === 'reset') {
        await kvSet(STORAGE_KEY, []);
        await kvSet(SESSION_KEY, { open: true });
        return res.json({ ok: true });
      }

      return res.json({ ok: false, error: 'Unknown action' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
