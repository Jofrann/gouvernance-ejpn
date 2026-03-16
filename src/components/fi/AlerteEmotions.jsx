/**
 * detectAlerteEmotions
 * Retourne true si la note "Émotions" d'un membre a baissé de ≥3 points
 * sur 2 semaines consécutives (les 2 dernières saisies avec présence).
 */
export function detectAlerteEmotions(membreId, allSaisies) {
  const saisiesMembre = allSaisies
    .filter(s => s.membre_id === membreId && s.presence && s.note_emotions != null)
    .sort((a, b) => new Date(a.semaine) - new Date(b.semaine));

  if (saisiesMembre.length < 2) return false;

  const last2 = saisiesMembre.slice(-2);
  const drop = last2[0].note_emotions - last2[1].note_emotions;
  return drop >= 3;
}

export default detectAlerteEmotions;