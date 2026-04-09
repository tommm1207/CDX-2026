export interface ReminderContentPayload {
  text: string;
  assignees: string[]; // empty means global
}

export const parseReminderContent = (contentRaw: string): ReminderContentPayload => {
  if (!contentRaw) return { text: '', assignees: [] };
  
  try {
    if (contentRaw.trim().startsWith('{"__v":1')) {
      const parsed = JSON.parse(contentRaw);
      return { text: parsed.text || '', assignees: parsed.assignees || [] };
    }
  } catch (e) {
    // Ignore error, treat as raw text
  }
  return { text: contentRaw, assignees: [] };
};

export const serializeReminderContent = (text: string, assignees: string[]): string => {
  if (!assignees || assignees.length === 0) return text; // Standard text for global
  return JSON.stringify({ __v: 1, text, assignees });
};
