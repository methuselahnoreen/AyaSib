import { PHRASES } from "./phrases.mjs";

const MAX_QUESTION = 2000;
const DEFAULT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

const TOPICS = ["fee", "requirements", "steps", "office", "processing_time"];
const INTENTS = new Set([...TOPICS, "overview", "greeting", "thanks", "other"]);

const fail = (status, code, message) => ({ status, body: { error: { code, message } } });

const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in values ? values[key] : `{${key}}`));

const serviceNames = (services) => services.map((s) => s.name_en).join(", ");

const emptyAnswer = () => ({
  summary: null,
  requirements: [],
  requirements_note: null,
  steps: [],
  office: null,
  fee: null,
  processing_time: null,
});

// The value backing each topic for a given service, or null/[] when absent.
function topicValue(service, topic) {
  switch (topic) {
    case "fee":
      return service.fee_ceb ?? service.fee ?? null;
    case "requirements":
      return (service.requirements_ceb && service.requirements_ceb.length ? service.requirements_ceb : null);
    case "steps":
      return service.steps_ceb && service.steps_ceb.length ? service.steps_ceb : null;
    case "office":
      return service.office_ceb ?? service.office ?? null;
    case "processing_time":
      return service.processing_time_ceb ?? service.processing_time ?? null;
    default:
      return null;
  }
}

const hasTopic = (service, topic) => {
  const v = topicValue(service, topic);
  return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
};

function routerPrompt(services) {
  const list = services
    .map((s) => `- ${s.id}: ${s.name_en}. ${[s.who_may_avail, s.scope_note, s.summary_ceb].filter(Boolean).join(" ")}`)
    .join("\n");
  return [
    "You are a classifier for a Cebu City government services assistant.",
    "You do NOT answer the user. You only classify the user's latest message.",
    "The message may be in Cebuano (Bisaya), Filipino or English, and may be short or informal.",
    "",
    "Return the ONE service the message is about, and the user's intent.",
    "Rules for service_id:",
    "- A message is about a service if it names the service, its document or its agency (for example NBI), even when short or informal.",
    "- Never invent an id. Copy it exactly from the SERVICES list.",
    "- Use null when the message is about a service or document NOT in the list, or is too vague to tell which service it means (for example only the word \"clearance\").",
    "- A PREVIOUS TOPIC may be given. Use it as the service ONLY when the message does not name or mention any service or document (for example a bare follow-up like \"pila ang bayad?\"). If the message names a different service, ignore the previous topic.",
    "",
    "Rules for intent (choose exactly one):",
    "- overview: general \"how do I get / what is this\" questions.",
    "- fee: pila, bayad, presyo, magkano.",
    "- requirements: kinahanglan, dad-on, papeles.",
    "- steps: unsaon, lakang, proseso.",
    "- office: asa, saan.",
    "- processing_time: unsa ka dugay, kanus-a, pila ka adlaw.",
    "- greeting: hello/hi/kumusta/maayong adlaw and similar.",
    "- thanks: salamat/thank you and similar.",
    "- other: anything else.",
    "",
    'Reply with ONLY a JSON object: {"service_id": "<id or null>", "intent": "<one of the intents>"}. No other text.',
    "",
    "SERVICES:",
    list,
  ].join("\n");
}

function parseRouter(text, services) {
  const cleaned = String(text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "");
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return { service_id: null, intent: "other" };

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { service_id: null, intent: "other" };
  }

  const serviceId = services.some((s) => s.id === parsed.service_id) ? parsed.service_id : null;
  let intent = typeof parsed.intent === "string" ? parsed.intent.trim() : "";
  if (!INTENTS.has(intent)) intent = serviceId ? "overview" : "other";

  return { service_id: serviceId, intent };
}

async function callModel({ accountId, token, model, messages }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages, temperature: 0, max_tokens: 800 }),
        signal: controller.signal,
      }
    );
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(`model call failed (${res.status})`);
    const reply = data?.result?.response ?? data?.result?.choices?.[0]?.message?.content ?? "";
    const text = typeof reply === "string" ? reply : JSON.stringify(reply);
    if (text.trim() === "") throw new Error("model returned an empty reply");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function buildSuggestions(service, currentIntent) {
  const suggestions = [];
  for (const topic of TOPICS) {
    if (topic === currentIntent) continue;
    if (!hasTopic(service, topic)) continue;
    suggestions.push({ label: PHRASES.suggestion[topic], intent: topic });
    if (suggestions.length === 3) break;
  }
  return suggestions;
}

function buildAnswer(service, intent) {
  const answer = emptyAnswer();

  // Non-topic intents (overview or anything else that reached here): summary only.
  if (!TOPICS.includes(intent)) {
    answer.summary = service.summary_ceb;
    return answer;
  }

  // Topic intents: lead phrase + only the matching field. Missing -> missing phrase, nothing else.
  if (!hasTopic(service, intent)) {
    answer.summary = fillTemplate(PHRASES.missing, { name: service.name_en });
    return answer;
  }

  answer.summary = fillTemplate(PHRASES.lead[intent], { name: service.name_en });
  const value = topicValue(service, intent);
  if (intent === "fee") answer.fee = value;
  else if (intent === "requirements") {
    answer.requirements = value;
    answer.requirements_note = service.requirements_note_ceb ?? null;
  } else if (intent === "steps") answer.steps = value;
  else if (intent === "office") answer.office = value;
  else if (intent === "processing_time") answer.processing_time = value;

  return answer;
}

export async function answerQuestion({ question, context, services, accountId, token, model }) {
  if (typeof question !== "string" || question.trim() === "") {
    return fail(400, "invalid_request", "question is required");
  }
  if (question.length > MAX_QUESTION) {
    return fail(413, "payload_too_large", `question is over ${MAX_QUESTION} characters`);
  }
  if (!accountId || !token) {
    return fail(500, "internal_error", "model credentials are not configured");
  }

  // Context is optional and trusted only when its service id exists in the KB.
  const contextService =
    context && services.some((s) => s.id === context.service_id)
      ? services.find((s) => s.id === context.service_id)
      : null;

  const userContent = contextService
    ? `PREVIOUS TOPIC: ${contextService.id} (${contextService.name_en})\n\nMESSAGE:\n${question.trim()}`
    : question.trim();

  let routed;
  try {
    const reply = await callModel({
      accountId,
      token,
      model: model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: routerPrompt(services) },
        { role: "user", content: userContent },
      ],
    });
    if (process.env.DEBUG_ROUTER) console.error("router reply:", reply);
    routed = parseRouter(reply, services);
  } catch (e) {
    console.error("upstream error:", e.message);
    return fail(502, "upstream_error", "the language model could not be reached");
  }

  // Social intents: a short chat reply, no sources or suggestions.
  if (routed.intent === "greeting" || routed.intent === "thanks") {
    const answer = emptyAnswer();
    answer.summary =
      routed.intent === "greeting"
        ? fillTemplate(PHRASES.greeting, { services: serviceNames(services) })
        : PHRASES.thanks;
    return {
      status: 200,
      body: { type: "chat", confident: true, answer, sources: [], suggestions: [] },
    };
  }

  const service = services.find((s) => s.id === routed.service_id);
  if (!service) {
    const message = `${PHRASES.notSure} ${fillTemplate(PHRASES.notSureHelp, { services: serviceNames(services) })}`;
    return {
      status: 200,
      body: { type: "not_sure", confident: false, answer: null, message, sources: [], suggestions: [] },
    };
  }

  const answer = buildAnswer(service, routed.intent);
  return {
    status: 200,
    body: {
      type: "answer",
      confident: true,
      service_id: service.id,
      intent: routed.intent,
      answer,
      sources: [{ title: service.source_title, url: service.source_url, last_verified: service.last_verified }],
      suggestions: buildSuggestions(service, routed.intent),
    },
  };
}
