export function simplifyTask(taskTitle) {
  const title = String(taskTitle ?? '').trim();
  const lower = title.toLowerCase();

  if (lower.startsWith('write') || lower.startsWith('create') || lower.startsWith('plan')) {
    const subject = title.replace(/^(write|create|plan)\s*/i, '').trim();
    if (subject) {
      return `Write 3 bullet points for ${subject}`;
    }
    return 'Write 3 bullet points';
  }

  if (lower.startsWith('read') || lower.startsWith('review')) {
    return 'Read for 2 minutes';
  }

  return `Spend 2 minutes on: ${title || 'this task'}`;
}
