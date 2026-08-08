const headings: Record<string, string[]> = {
  morning: [
    "Good morning. What are we building today?",
    "Good morning - ready when you are.",
    "Good morning, a fresh day to create something.",
  ],
  daytime: [
    "Welcome back. What can we build today?",
    "Let's get to work.",
    "What are we creating today?",
    "Every result starts with a single prompt.",
  ],
  evening: [
    "Good evening. Anything you'd like to explore?",
    "One more build before wrapping up?",
    "Good evening. A quiet moment to create.",
  ],
  night: [
    "Working late - let's make it count.",
    "Quiet hours, focused work.",
    "The best ideas often arrive at night.",
  ],
  monday: [
    "Fresh start - let's build.",
    "New week, new possibilities.",
    "Start the week strong.",
  ],
  tuesday: [
    "Momentum is building.",
    "Steady progress, one block at a time.",
    "Keep the momentum going.",
  ],
  wednesday: [
    "Midweek - keep the momentum.",
    "Halfway there - keep going.",
    "Solid work compounds.",
  ],
  thursday: [
    "The finish line is in sight.",
    "Building through Thursday.",
    "Almost there - don't slow down.",
  ],
  friday: [
    "Ship it, then rest easy.",
    "End the week on a high.",
    "Finish strong, then enjoy the weekend.",
  ],
  saturday: [
    "Your weekend - your pace.",
    "A great day to build.",
    "No rush today. Just build.",
  ],
  sunday: [
    "Rest, reset, or create.",
    "A calm day for intentional work.",
    "The perfect day to plan and create.",
  ],
  inspirational: [
    "From idea to outcome in a prompt.",
    "Every great result starts with a single prompt.",
    "Make something worth showing.",
  ],
};

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyGreeting(): { heading: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const dateStr = now.toISOString().split("T")[0];
  const seed = simpleHash(dateStr);

  let poolKey: string;
  if (hour >= 22 || hour < 6) {
    poolKey = "night";
  } else if (hour < 12) {
    poolKey = "morning";
  } else if (hour >= 17) {
    poolKey = "evening";
  } else {
    poolKey = dayNames[dayOfWeek];
  }

  const pool = headings[poolKey] ?? headings.inspirational;
  const heading = pool[seed % pool.length];

  return { heading };
}