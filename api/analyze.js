// api/analyze.js - Genera el análisis con IA usando contexto histórico de summits anteriores

const HISTORICAL_CONTEXT = `
CONTEXTO HISTÓRICO DE LOS PARTNER SUMMITS SAP LAC (2022-2025):

SUMMIT 2022 (Post Mortem - Problemas detectados):
- Superposición de agenda: las sesiones one-to-one chocaban con discussion forums y workshops, perdiendo audiencia
- Muy baja participación de ejecutivos de SAP en los discussion forums
- Logística y layout de salones: cambios de último momento generaron problemas
- Plataforma de comunicación falló en una primera instancia
- Gestión de traslados ineficiente por falta de carga de itinerarios
- Sin dossier/concierge para gestión de invitados (muchas horas extra de trabajo)
- Sin carrito de compras web: cobranza manual uno a uno con pagos pendientes
- Acompañantes no estaban contemplados en cocktail y cena de cierre

SUMMIT 2022 (Lo que funcionó):
- Speed Dating Stations con ejecutivos SAP LAC (formato innovador)
- Integration Activity: Carnival Percussion Masters (alta valoración)
- Meet the Sponsor (AWS, Google Cloud, Intel, Thomson Reuters)
- Booking de reuniones ejecutivas (156 executive meetings realizados)

SUMMIT 2024 (Bariloche, Llao Llao Hotel - 244 asistentes):
- 8 SAP Sessions + 8 Masterclasses en 3 días
- 196 reuniones 1:1 ejecutivas
- Actividades à la carte: Biking, Trekking, Golf, Ski, Mindfulness
- Purpose Activity el último día
- Outdoor Experience
- Masterclasses en paralelo (4 pistas simultáneas): AI, Cloud, Sustainability, Partner Autonomy
- Dinner en Cervecería Patagonia (Día 1), Mate Tasting Activity, Closing Dinner (Día 2)

SUMMIT 2025 (Cartagena, Casa 1537 - en planificación):
- Formato "Partner Summit Villa": centro de convenciones en ciudad amurallada
- +200 asistentes, +40 sesiones, agenda de 3 días
- Foco en SAP Business AI y Cloud First
- Alojamiento en hoteles boutique dentro del perímetro
- Concierge dedicado por hotel
- Masterclasses con 5 espacios temáticos simultáneos
- Actividades culturales locales (artesanas de La Boquilla, sombrero vueltiao como gift)
- Cena de cierre con temática García Márquez / realismo mágico
- Sponsors: Diamante, Platino, Oro, Mención
- Ticketing: desde $4,300 USD (Twin) hasta $7,700 USD (Full Experience)
- Puesto de artesanos always-on durante breaks

PATRONES RECURRENTES (lo que aparece edición tras edición):
- Las reuniones 1:1 son el formato más valorado por los partners C-level
- Los formatos participativos (workshops, speed dating, actividades) superan a las sesiones expositivas
- La IA/tecnología es tema central desde 2023
- La experiencia social/networking es tan importante como el contenido
- Los acompañantes son una variable no resuelta del todo
- La logística y comunicación pre-evento son puntos débiles históricos
`;

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

  if (req.method === 'GET') {
    // Return current analysis state
    const analysis = await kvGet('dkc_analysis');
    return res.json({ analysis });
  }

  if (req.method === 'POST') {
    const { action, responses } = req.body;

    if (action === 'analyze') {
      // Start analysis - set pending state first
      await kvSet('dkc_analysis', { status: 'analyzing', startedAt: new Date().toISOString() });

      // Build prompt
      const deletes = responses.filter(r => r.deleteText).map(r => `- ${r.name}: "${r.deleteText}"`).join('\n');
      const keeps   = responses.filter(r => r.keepText).map(r => `- ${r.name}: "${r.keepText}"`).join('\n');
      const creates = responses.filter(r => r.createText).map(r => `- ${r.name}: "${r.createText}"`).join('\n');

      const prompt = `Sos un estratega de eventos con profundo conocimiento del ecosistema SAP en Latinoamérica. Tu tarea es analizar las respuestas de los líderes del Partner Summit y cruzarlas con el historial de las ediciones anteriores para generar insights accionables.

${HISTORICAL_CONTEXT}

RESPUESTAS DE LOS LÍDERES EN LA DINÁMICA "DELETE / KEEP / CREATE" (${responses.length} participantes):

DELETE — Lo que debería desaparecer:
${deletes || '(sin respuestas)'}

KEEP — Lo que debería mantenerse:
${keeps || '(sin respuestas)'}

CREATE — Lo que debería crearse:
${creates || '(sin respuestas)'}

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin comillas escapadas innecesarias. Usá solo comillas dobles. No uses apóstrofes dentro de los valores. El JSON debe tener exactamente esta estructura:

{
  "headline": "Una frase potente que capture la esencia del diagnóstico colectivo (máx 12 palabras)",
  "subheadline": "Una frase que amplíe el headline con el insight central (máx 20 palabras)",
  "tensiones": [
    { "titulo": "...", "descripcion": "...", "historico": "¿ya apareció antes? ¿cuándo?" }
  ],
  "consensos": [
    { "titulo": "...", "descripcion": "...", "historico": "¿ya apareció antes? ¿cuándo?" }
  ],
  "ideas_radicales": [
    { "titulo": "...", "descripcion": "...", "factibilidad": "alta/media/baja", "razon": "por qué es o no factible según el historial" }
  ],
  "oportunidades": [
    { "titulo": "...", "descripcion": "...", "prioridad": "alta/media/baja" }
  ],
  "proximos_pasos": [
    { "accion": "...", "responsable": "SAP/Partners/Ambos", "plazo": "inmediato/corto/mediano" }
  ],
  "distribucion": {
    "delete_count": ${responses.filter(r => r.deleteText).length},
    "keep_count": ${responses.filter(r => r.keepText).length},
    "create_count": ${responses.filter(r => r.createText).length},
    "temas_delete": ["tema1", "tema2", "tema3"],
    "temas_keep": ["tema1", "tema2", "tema3"],
    "temas_create": ["tema1", "tema2", "tema3"]
  },
  "resumen_ejecutivo": "Párrafo de 3-4 oraciones para enviar por mail. Directo, sin preambuló, accionable."
}

Sé específico, usá los nombres reales cuando sea relevante, y siempre contrastá con el historial. Máximo 5 items por sección.`;

      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const aiData = await aiRes.json();
        
        // Handle API errors
        if (aiData.error) {
          throw new Error('Anthropic API error: ' + aiData.error.message);
        }
        if (!aiData.content || !Array.isArray(aiData.content)) {
          throw new Error('Unexpected API response: ' + JSON.stringify(aiData).slice(0, 200));
        }
        
        const rawText = aiData.content.map(b => b.text || '').join('');
        
        // Clean and parse JSON — multiple strategies
        let clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        // Find the outermost JSON object
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found in response');
        clean = clean.slice(start, end + 1);
        
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch(parseErr) {
          // Try to fix common issues: trailing commas, unescaped quotes
          const fixed = clean
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"');
          try {
            parsed = JSON.parse(fixed);
          } catch(e2) {
            throw new Error('JSON parse failed: ' + parseErr.message + ' | Raw: ' + clean.slice(0, 500));
          }
        }

        const analysis = {
          status: 'ready',
          published: false,
          data: parsed,
          generatedAt: new Date().toISOString(),
          participantCount: responses.length
        };

        await kvSet('dkc_analysis', analysis);
        return res.json({ ok: true, analysis });

      } catch (e) {
        await kvSet('dkc_analysis', { status: 'error', error: e.message });
        return res.status(500).json({ ok: false, error: e.message });
      }
    }

    if (action === 'publish') {
      const analysis = await kvGet('dkc_analysis');
      if (!analysis) return res.json({ ok: false, error: 'No hay análisis' });
      analysis.published = true;
      analysis.publishedAt = new Date().toISOString();
      await kvSet('dkc_analysis', analysis);
      return res.json({ ok: true });
    }

    if (action === 'unpublish') {
      const analysis = await kvGet('dkc_analysis');
      if (!analysis) return res.json({ ok: false });
      analysis.published = false;
      await kvSet('dkc_analysis', analysis);
      return res.json({ ok: true });
    }

    if (action === 'reset') {
      await kvSet('dkc_analysis', null);
      return res.json({ ok: true });
    }
  }
}
