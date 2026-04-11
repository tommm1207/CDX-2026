export interface ReminderContentPayload {
  text: string;
  assignees: string[]; // empty means global
  show_assignees?: boolean; // visibility option
}

export const parseReminderContent = (contentRaw: string): ReminderContentPayload => {
  if (!contentRaw) return { text: '', assignees: [] };

  try {
    if (contentRaw.trim().startsWith('{"__v":1')) {
      const parsed = JSON.parse(contentRaw);
      return {
        text: parsed.text || '',
        assignees: parsed.assignees || [],
        show_assignees: parsed.show_assignees ?? false,
      };
    }
  } catch (e) {
    // Ignore error, treat as raw text
  }
  return { text: contentRaw, assignees: [] };
};

export const serializeReminderContent = (
  text: string,
  assignees: string[],
  show_assignees: boolean = false,
): string => {
  return JSON.stringify({ __v: 1, text, assignees, show_assignees });
};
