/**
 * Shared input validation utilities for API routes.
 * Enhanced with security sanitization and prompt injection detection.
 */

import { sanitizeInput, detectPromptInjection, validateSymptoms } from "../../src/utils/security.js";
import { escapeHtml } from "./htmlEscape.js";

/**
 * Safely parses a request body (handles string or object).
 * Returns parsed object or null on failure.
 */
export function parseBody(req) {
  try {
    if (!req.body) return {};
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return null;
  }
}

/**
 * Validates the messages array for the /api/diagnose endpoint.
 * - Enforces max message count
 * - Truncates individual messages to prevent oversized payloads
 * - Rejects client-injected system messages
 * - Sanitizes text content
 * - Detects prompt injection attempts
 */
export function validateDiagnoseMessages(messages, opts = {}) {
  const { maxMessages = 20, maxTextLength = 5000, maxImageCount = 5 } = opts;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: "No messages provided" };
  }

  if (messages.length > maxMessages) {
    return { valid: false, error: `Too many messages (max ${maxMessages})` };
  }

  let imageCount = 0;
  const sanitized = [];

  for (const msg of messages) {
    // Reject client-injected system messages
    if (msg.role === "system") continue;

    // Only allow user and assistant roles
    if (msg.role !== "user" && msg.role !== "assistant") continue;

    if (typeof msg.content === "string") {
      // Check for prompt injection
      if (detectPromptInjection(msg.content)) {
        return {
          valid: false,
          error: "Invalid input detected. Please describe your crop symptoms clearly.",
        };
      }

      sanitized.push({
        role: msg.role,
        content: sanitizeInput(msg.content).slice(0, maxTextLength),
      });
    } else if (Array.isArray(msg.content)) {
      const blocks = [];
      for (const block of msg.content) {
        if (block.type === "text" && block.text) {
          // Check for prompt injection in text blocks
          if (detectPromptInjection(block.text)) {
            return {
              valid: false,
              error: "Invalid input detected. Please describe your crop symptoms clearly.",
            };
          }

          blocks.push({
            type: "text",
            text: sanitizeInput(block.text).slice(0, maxTextLength),
          });
        } else if (block.type === "image" && block.source?.type === "base64") {
          imageCount++;
          if (imageCount <= maxImageCount) {
            // Limit base64 size to ~2MB
            const maxDataLen = 2_700_000; // ~2MB base64
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: block.source.media_type || "image/jpeg",
                data: block.source.data?.slice(0, maxDataLen) || "",
              },
            });
          }
        }
      }
      if (blocks.length > 0) {
        sanitized.push({ role: msg.role, content: blocks });
      }
    }
  }

  if (sanitized.length === 0) {
    return { valid: false, error: "No valid messages after sanitization" };
  }

  return { valid: true, messages: sanitized, imageCount };
}

/**
 * Validates a visitor ID string.
 */
export function validateVisitorId(id) {
  if (!id || typeof id !== "string") return "";
  return id.trim().slice(0, 120);
}

/**
 * Validates a section string.
 */
export function validateSection(section, allowedSections = null) {
  if (!section || typeof section !== "string") return "home";
  const trimmed = section.trim().slice(0, 50);
  if (allowedSections && !allowedSections.includes(trimmed)) return "home";
  return trimmed;
}

/**
 * Validates feedback input.
 */
export function validateFeedback(body) {
  return {
    context: String(body.context || "Unknown").slice(0, 120),
    rating: Math.min(Math.max(Number(body.rating) || 0, 0), 5),
    feedback: String(body.feedback || "").slice(0, 4000),
    email: String(body.email || "").slice(0, 320),
    summary: String(body.summary || "").slice(0, 2000),
    visitorId: String(body.visitorId || "").slice(0, 120),
  };
}

/**
 * Case-sync record validation for POST /api/community?resource=cases.
 *
 * Crop-health cases are LOCAL-FIRST: photos, thumbnails and precise GPS
 * coordinates must never reach the server. This validator therefore copies
 * ONLY whitelisted scalar metadata fields into the stored record — anything
 * else in the payload (including media and location keys) is silently
 * dropped, and strings are hard-capped at 300 chars so no base64 image can
 * smuggle through.
 *
 * @param {object} body - parsed request body
 * @returns {{record?: object, error?: string}}
 */
const CASE_SYNC_TYPES = ["case_created", "observation", "treatment", "evaluation"];
const CASE_SYNC_PAYLOAD_KEYS = [
  "crop",
  "variety",
  "district",
  "upazila",
  "growthStage",
  "status",
  "severity",
  "symptomSummary",
];
const CASE_SYNC_ID_RE = /^[\w:.-]+$/;

export function validateCaseSyncRecord(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid body" };
  }

  const recordId = typeof body.recordId === "string" ? body.recordId.trim() : "";
  if (!recordId || recordId.length > 64 || !CASE_SYNC_ID_RE.test(recordId)) {
    return { error: "Invalid recordId" };
  }

  const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";
  if (!caseId || caseId.length > 64 || !CASE_SYNC_ID_RE.test(caseId)) {
    return { error: "Invalid caseId" };
  }

  const type = typeof body.type === "string" ? body.type.trim() : "";
  if (!CASE_SYNC_TYPES.includes(type)) {
    return { error: "Invalid type" };
  }

  const rawPayload =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
  const payload = {};
  for (const key of CASE_SYNC_PAYLOAD_KEYS) {
    const value = rawPayload[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      payload[key] = escapeHtml(value.slice(0, 300));
    } else if (typeof value === "number" && Number.isFinite(value)) {
      payload[key] = value;
    } else if (typeof value === "boolean") {
      payload[key] = value;
    }
    // Objects/arrays are never copied — metadata only.
  }

  const createdAt = typeof body.createdAt === "string" && body.createdAt.length <= 40 ? body.createdAt : null;

  return { record: { recordId, caseId, type, payload, createdAt } };
}
