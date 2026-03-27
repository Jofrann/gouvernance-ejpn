import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TYPE_LABELS = {
  pdf: "📄 PDF",
  video: "🎥 Vidéo",
  lien: "🔗 Lien",
};

const AXE_LABELS = {
  connaissance: "Connaissance (Savoir)",
  intelligence: "Intelligence (Comprendre)",
  croyance: "Croyance (Intégrer)",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const ressource = payload?.data;
    if (!ressource) {
      return Response.json({ error: "No ressource data in payload" }, { status: 400 });
    }

    // Fetch all users with service role
    const users = await base44.asServiceRole.entities.User.list();

    if (!users || users.length === 0) {
      return Response.json({ message: "No users to notify" });
    }

    const typeLabel = TYPE_LABELS[ressource.type_ressource] || ressource.type_ressource;
    const axeLabel = AXE_LABELS[ressource.axe] || ressource.axe || "";
    const mois = ressource.mois_cycle || "";

    const subject = `📚 Nouvelle ressource de formation : ${ressource.titre}`;
    const body = `
Bonjour,

Une nouvelle ressource de formation vient d'être ajoutée sur la plateforme O.S.P — EJPN.

─────────────────────────────────
📘 ${ressource.titre}
─────────────────────────────────

🗂 Type       : ${typeLabel}
📅 Mois/Cycle : ${mois}
🧠 Axe        : ${axeLabel}
${ressource.description ? `\n📝 Description : ${ressource.description}\n` : ""}
${ressource.url ? `🔗 Accéder à la ressource : ${ressource.url}` : ""}

─────────────────────────────────

Rendez-vous sur la plateforme dans la section Formation pour consulter cette ressource.

Bonne formation !
L'équipe EJPN
    `.trim();

    // Send email to each user
    const results = await Promise.allSettled(
      users
        .filter(u => u.email)
        .map(u =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: u.email,
            subject,
            body,
          })
        )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return Response.json({ message: `Emails sent: ${sent}, failed: ${failed}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});