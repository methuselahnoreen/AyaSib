const GREETING = "Kumusta! Makatabang ko bahin sa mga opisyal nga dokumento ug serbisyo. Unsa imong gustong mahibal-an?";
const FAREWELL = "Sige, amping! Mobalik lang kung naa kay pangutana bahin sa mga dokumento o serbisyo.";
const OUT_OF_SCOPE = "Makatabang ko sa mga opisyal nga dokumento ug serbisyo nga anaa sa akong lista. Isulti lang kung unsang dokumento o serbisyo ang imong pangutan-an.";
const NOT_SURE = "Dili ko sigurado niini. Palihug kumpirmaha sa opisina.";
const MAX_QUESTION = 2000;
const DEFAULT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const GREETINGS = new Set(["hi", "hello", "hey", "hi aya", "hello aya", "kumusta", "maayong adlaw", "maayong buntag", "maayong hapon", "maayong gabii"]);
const FAREWELLS = new Set(["bye", "goodbye", "good bye", "see you", "good night", "amping", "sige", "salamat"]);
const SERVICE_TERMS = new Set([
  "apply", "application", "appointment", "barangay", "birth", "certificate", "chd", "civil", "clearance",
  "document", "documents", "enroll", "enrollment", "enrolment", "fee", "fees", "government", "gobyerno",
  "id", "kasal", "kuha", "lisensya", "mangayo", "marriage", "nbi", "office", "opisina", "papeles",
  "passport", "pay", "permit", "pagkuha", "pag apply", "pangayo", "psa", "record", "register", "registration",
  "requirements", "renew", "serbisyo", "sertipiko", "service", "services", "death", "death certificate",
  "city hall", "city health", "civil registry", "cenomar", "dokumento", "dokumento", "kinahanglan", "bayad",
  "pila", "asa", "unsaon", "opisyal", "gobyerno", "government service",
]);

const fail = (status, code, message) => ({ status, body: { error: { code, message } } });
const notConfident = (message = NOT_SURE) => ({ status: 200, body: { confident: false, answer: null, message, sources: [] } });
const normalizeInput = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").trim().replace(/\s+/g, " ");

function socialResponse(question) {
  const normalized = normalizeInput(question);
  if (GREETINGS.has(normalized)) return notConfident(GREETING);
  if (FAREWELLS.has(normalized)) return notConfident(FAREWELL);
  return null;
}

function isClearlyOutOfScope(question) {
  const normalized = ` ${normalizeInput(question)} `;
  return ![...SERVICE_TERMS].some((term) => {
    const normalizedTerm = normalizeInput(term);
    return normalizedTerm.includes(" ") ? normalized.includes(` ${normalizedTerm} `) : normalized.split(" ").includes(normalizedTerm);
  });
}

function routerPrompt(services) {
  const list = services
    .map((s) => `- ${s.id}: ${s.name_en}. ${[s.who_may_avail, s.scope_note, s.summary_ceb].filter(Boolean).join(" ")}`)
    .join("\n");
  return [
    "You are a router for a Cebu City government services assistant.",
    "The user's question may be in Cebuano (Bisaya), Filipino or English, and may be short or informal.",
    "Useful Cebuano words: unsaon = how, asa = where, pila = how much, unsa = what, kinahanglan = needed or required, bayad = fee or payment, mangayo or kuha = to get or request, mag-apply = to apply.",
    "Choose the ONE service below that the question is about. A question is about a service if it names the service, its document or its agency (for example NBI), even when the wording is short or informal.",
    "Answer null only if the question is about a different service or document that is not in the list, is too vague to tell which service it means (for example just the word clearance), or is unrelated to these services.",
    "The service_id must be copied exactly from the SERVICES list below. Never invent an id; if no listed service fits, answer null.",
    'Reply with ONLY a JSON object like {"service_id": "nbi-clearance"} or {"service_id": null}. No other text.',
    "",
    "SERVICES:",
    list,
  ].join("\n");
}

function parseServiceId(text, services) {
  const cleaned = String(text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "");
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const id = JSON.parse(match[0]).service_id;
    return services.some((s) => s.id === id) ? id : null;
  } catch {
    return null;
  }
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

export async function answerQuestion({ question, services, accountId, token, model }) {
  if (typeof question !== "string" || question.trim() === "") {
    return fail(400, "invalid_request", "question is required");
  }
  if (question.length > MAX_QUESTION) {
    return fail(413, "payload_too_large", `question is over ${MAX_QUESTION} characters`);
  }
  const social = socialResponse(question.trim());
  if (social) return social;
  if (isClearlyOutOfScope(question)) return notConfident(OUT_OF_SCOPE);
  if (!accountId || !token) {
    return fail(500, "internal_error", "model credentials are not configured");
  }

  let serviceId;
  try {
    const reply = await callModel({
      accountId,
      token,
      model: model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: routerPrompt(services) },
        { role: "user", content: question.trim() },
      ],
    });
    if (process.env.DEBUG_ROUTER) console.error("router reply:", reply);
    serviceId = parseServiceId(reply, services);
  } catch (e) {
    console.error("upstream error:", e.message);
    return fail(502, "upstream_error", "the language model could not be reached");
  }

  const s = services.find((x) => x.id === serviceId);
  if (!s) {
    return notConfident();
  }

  return {
    status: 200,
    body: {
      confident: true,
      answer: {
        summary: s.summary_ceb,
        requirements: s.requirements_ceb,
        requirements_note: s.requirements_note_ceb ?? null,
        steps: s.steps_ceb ?? [],
        office: s.office_ceb ?? s.office ?? null,
        fee: s.fee_ceb ?? s.fee ?? null,
        processing_time: s.processing_time_ceb ?? s.processing_time ?? null,
      },
      sources: [{ title: s.source_title, url: s.source_url, last_verified: s.last_verified }],
    },
  };
}