// api/email.js - Envío de emails via Resend (gratis hasta 3000/mes)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).end();

  const { to, type, analysis, participantName } = req.body;

  if (!to || !analysis) return res.status(400).json({ ok: false, error: 'Faltan datos' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ ok: false, error: 'RESEND_API_KEY no configurada' });

  const d = analysis.data;

  const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Análisis Partner Summit</title></head>
<body style="margin:0;padding:0;background:#f0eee8;font-family:-apple-system,Helvetica Neue,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#001550 0%,#0E0637 55%,#1C0C6E 100%);padding:32px 32px 28px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:12px;">SAP Partner Summit · Delete / Keep / Create</div>
      <div style="font-size:26px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:8px;">${d.headline}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.5;">${d.subheadline}</div>
    </div>

    <!-- Stats bar -->
    <div style="background:#f8f7f3;border-bottom:1px solid #e8e6e0;padding:16px 32px;display:flex;gap:24px;">
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:800;color:#DF1278;">${d.distribucion.delete_count}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Delete</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:800;color:#04ACA7;">${d.distribucion.keep_count}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Keep</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:800;color:#7B5CFA;">${d.distribucion.create_count}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Create</div>
      </div>
      <div style="text-align:center;margin-left:auto">
        <div style="font-size:22px;font-weight:800;color:#2C2C2A;">${analysis.participantCount}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Participantes</div>
      </div>
    </div>

    <div style="padding:28px 32px;">

      <!-- Resumen ejecutivo -->
      <div style="background:#f0eee8;border-radius:10px;padding:18px 20px;margin-bottom:24px;border-left:4px solid #534AB7;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#534AB7;text-transform:uppercase;margin-bottom:8px;">Resumen ejecutivo</div>
        <div style="font-size:14px;line-height:1.6;color:#2C2C2A;">${d.resumen_ejecutivo}</div>
      </div>

      <!-- Tensiones -->
      ${d.tensiones && d.tensiones.length ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin-bottom:12px;">⚡ Tensiones identificadas</div>
        ${d.tensiones.map(t => `
          <div style="border:1px solid #e8e6e0;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:700;color:#2C2C2A;margin-bottom:4px;">${t.titulo}</div>
            <div style="font-size:13px;color:#5f5e5a;line-height:1.5;margin-bottom:6px;">${t.descripcion}</div>
            ${t.historico ? `<div style="font-size:11px;color:#888;font-style:italic;">📋 ${t.historico}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Consensos -->
      ${d.consensos && d.consensos.length ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin-bottom:12px;">✅ Consensos del grupo</div>
        ${d.consensos.map(c => `
          <div style="border:1px solid #c8e6c9;border-radius:8px;padding:14px 16px;margin-bottom:8px;background:#f1f8e9;">
            <div style="font-size:14px;font-weight:700;color:#2C2C2A;margin-bottom:4px;">${c.titulo}</div>
            <div style="font-size:13px;color:#5f5e5a;line-height:1.5;margin-bottom:6px;">${c.descripcion}</div>
            ${c.historico ? `<div style="font-size:11px;color:#888;font-style:italic;">📋 ${c.historico}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Ideas radicales -->
      ${d.ideas_radicales && d.ideas_radicales.length ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin-bottom:12px;">🚀 Ideas radicales</div>
        ${d.ideas_radicales.map(i => `
          <div style="border:1px solid #e8e6e0;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <div style="font-size:14px;font-weight:700;color:#2C2C2A;">${i.titulo}</div>
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${i.factibilidad==='alta'?'#e8f5e9;color:#2e7d32':i.factibilidad==='media'?'#fff3e0;color:#e65100':'#fce4ec;color:#c62828'};">${i.factibilidad}</span>
            </div>
            <div style="font-size:13px;color:#5f5e5a;line-height:1.5;margin-bottom:6px;">${i.descripcion}</div>
            <div style="font-size:11px;color:#888;font-style:italic;">💡 ${i.razon}</div>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Próximos pasos -->
      ${d.proximos_pasos && d.proximos_pasos.length ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin-bottom:12px;">→ Próximos pasos</div>
        ${d.proximos_pasos.map((p, i) => `
          <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0eee8;">
            <div style="width:22px;height:22px;border-radius:50%;background:#534AB7;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:22px;text-align:center;">${i+1}</div>
            <div>
              <div style="font-size:13px;color:#2C2C2A;line-height:1.5;">${p.accion}</div>
              <div style="font-size:11px;color:#888;margin-top:2px;">${p.responsable} · ${p.plazo}</div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#f8f7f3;padding:20px 32px;text-align:center;border-top:1px solid #e8e6e0;">
      <div style="font-size:12px;color:#aaa;">Generado durante el SAP Partner Summit · Delete / Keep / Create</div>
      <div style="font-size:11px;color:#ccc;margin-top:4px;">${new Date().toLocaleDateString('es-AR', {day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
  </div>
</body>
</html>`;

  const subject = type === 'moderator'
    ? `Análisis completo · SAP Partner Summit DKC`
    : `Tu análisis del Partner Summit · Delete / Keep / Create`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SAP Partner Summit <onboarding@resend.dev>',
        to: [to],
        subject,
        html: emailHtml
      })
    });

    const emailData = await emailRes.json();
    if (emailData.id) {
      return res.json({ ok: true, id: emailData.id });
    } else {
      return res.status(400).json({ ok: false, error: emailData.message || 'Error al enviar' });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
