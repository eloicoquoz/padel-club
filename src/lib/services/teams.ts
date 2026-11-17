/**
 * Publication dans un canal Teams via un webhook entrant (Workflows / "Publier dans un canal
 * lorsqu'une requête webhook est reçue"). Aucune appli Entra à faire valider.
 * Variables : TEAMS_WEBHOOK_URL (obligatoire pour activer), TEAMS_LANG (fr|de|en, défaut fr),
 * APP_URL (pour les boutons).
 */
export type TeamsCard = {
  title: string;
  text: string;
  facts?: { title: string; value: string }[];
  chips?: string[];
  actions?: { title: string; url: string }[];
};

export async function postToTeams(card: TeamsCard): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return;
  const body = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          msteams: { width: "Full" },
          body: [
            { type: "TextBlock", size: "Large", weight: "Bolder", text: card.title, wrap: true },
            { type: "TextBlock", text: card.text, wrap: true },
            ...(card.facts?.length ? [{ type: "FactSet", facts: card.facts }] : []),
            ...(card.chips?.length
              ? [{ type: "TextBlock", text: card.chips.map((c) => `**${c}**`).join("  ·  "), wrap: true, isSubtle: true }]
              : []),
          ],
          actions: (card.actions ?? []).map((a) => ({ type: "Action.OpenUrl", title: a.title, url: a.url })),
        },
      },
    ],
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn("[teams] webhook failed", err);
  }
}

export function appUrl(path = "/") {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}
