import fs from "node:fs/promises";
import path from "node:path";
import { answerQuestion } from "../lib/ask.mjs";

const DEFAULT_OCR_MODEL = "@cf/microsoft/trocr-large-printed";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function usage() {
  console.log(
    "Usage: node --env-file=../.env.local scripts/photo-ocr.mjs <image-path> [--ask <question>]\n" +
      "\n" +
      "Extract printed text from a JPEG or PNG photo. Add --ask to send the extracted\n" +
      "text and your question through the backend knowledge-base answer flow."
  );
}

function parseArgs(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    usage();
    return null;
  }

  const imagePath = args[0];
  if (!imagePath || (args.length !== 1 && args.length !== 3) || (args.length === 3 && args[1] !== "--ask")) {
    throw new Error("Invalid arguments. Use --help to see usage.");
  }

  const question = args.length === 3 ? args[2].trim() : null;
  if (args.length === 3 && !question) {
    throw new Error("The question after --ask must not be empty.");
  }

  return { imagePath, question };
}

async function readImage(imagePath) {
  const resolvedPath = path.resolve(imagePath);
  const extension = path.extname(resolvedPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Only JPEG (.jpg, .jpeg) and PNG (.png) images are supported.");
  }

  const image = await fs.readFile(resolvedPath);
  if (image.length === 0) throw new Error("The image file is empty.");
  if (image.length > MAX_IMAGE_BYTES) {
    throw new Error(`The image exceeds the ${MAX_IMAGE_BYTES / (1024 * 1024)} MB size limit.`);
  }
  return image;
}

async function extractText(image, { accountId, token, model }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: Array.from(image) }),
        signal: controller.signal,
      }
    );

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`OCR service returned an invalid response (HTTP ${response.status}).`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(`OCR service request failed (HTTP ${response.status}).`);
    }

    const text = data?.result?.text;
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("OCR service did not detect any printed text.");
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) return;

  const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!accountId || !token) {
    throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.");
  }

  const image = await readImage(options.imagePath);
  const text = await extractText(image, {
    accountId,
    token,
    model: process.env.OCR_MODEL || DEFAULT_OCR_MODEL,
  });

  console.log("Extracted text:\n");
  console.log(text);

  if (!options.question) return;

  const services = JSON.parse(
    await fs.readFile(new URL("../data/kb.json", import.meta.url), "utf8")
  );
  const result = await answerQuestion({
    question: `${options.question}\n\nText extracted from the photo:\n${text}`,
    services,
    accountId,
    token,
    model: process.env.LLM_MODEL,
  });

  console.log("\nBackend answer:");
  if (result.status !== 200) {
    throw new Error(`Backend request failed (${result.status}): ${result.body.error.code}`);
  }
  if (!result.body.confident) {
    console.log(result.body.message);
    return;
  }

  console.log(result.body.answer.summary);
  console.log(`Source: ${result.body.sources[0].title} (${result.body.sources[0].url})`);
}

main().catch((error) => {
  console.error(`Photo OCR failed: ${error.message}`);
  process.exitCode = 1;
});