const MAX_EXCHANGES = 5;
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Validate and sanitize conversation history from clients.
 * Returns a cleaned array of { role, content } objects, or empty array if invalid.
 *
 * - Only "user" and "assistant" roles allowed
 * - Content trimmed and truncated to MAX_MESSAGE_LENGTH
 * - Array truncated to last MAX_EXCHANGES * 2 messages
 * - Invalid entries silently dropped
 */
export function sanitizeConversationHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const allowedRoles = new Set(["user", "assistant"]);

  const cleaned = history
    .filter(
      (msg) =>
        msg &&
        typeof msg.role === "string" &&
        allowedRoles.has(msg.role) &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));

  const maxMessages = MAX_EXCHANGES * 2;
  if (cleaned.length > maxMessages) {
    return cleaned.slice(cleaned.length - maxMessages);
  }

  return cleaned;
}

export { MAX_EXCHANGES, MAX_MESSAGE_LENGTH };
