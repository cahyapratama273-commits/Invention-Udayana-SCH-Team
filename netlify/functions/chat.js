// Netlify Function: proxies chat requests to Gemini, rotating across
// up to 5 API keys on rate-limit/quota errors. No npm dependencies
// needed — Netlify's Node runtime already has global fetch.

const { handleChat } = require("./chat-core");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  // Preflight CORS support
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  let messages;
  try {
    const parsed = JSON.parse(event.body || "{}");
    messages = parsed.messages;
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  try {
    const result = await handleChat(process.env, messages);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result)
    };
  } catch (e) {
    return {
      statusCode: e.status || 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: e.allFailed
          ? "AI saat ini sedang tidak tersedia. Coba beberapa saat lagi."
          : "Terjadi kesalahan pada server.",
        detail: e.message,
      }),
    };
  }
};