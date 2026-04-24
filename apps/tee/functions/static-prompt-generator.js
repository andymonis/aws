export class StaticPromptGenerator {
  async generate({ type }) {
    if (type === 'skip') {
      return 'What’s the smallest version of this?';
    }

    if (type === 'fatigue') {
      return 'Do a 2 minute version of something';
    }

    return 'Try a different approach';
  }
}
