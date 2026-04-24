export class AIPromptGenerator {
  constructor(client) {
    this.client = client;
  }

  async generate({ type, taskTitle, signals }) {
    const prompt = `User is struggling with task: "${taskTitle ?? 'unknown'}"

Context:
- type: ${type}
- skip streak: ${signals?.skipStreak ?? 0}
- fatigue: ${signals?.fatigueScore ?? 0}

Generate a short (max 10 words), actionable coaching prompt.
Avoid generic advice.
Start with a verb.`;

    const response = await this.client.generateText(prompt);

    return String(response).trim();
  }
}
