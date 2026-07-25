const headings: Record<string, string[]> = {
  monday: [
    "Monday mode: build everything.",
    "Monday's for builders. Let's go.",
    "Happy Monday! Let's start routing.",
    "Fresh week. Fresh builds. Let's go.",
  ],
  tuesday: [
    "Tuesday building mode: activated.",
    "Tuesday momentum. Don't lose it.",
    "Tuesday! Chain those models.",
    "Tuesday vibes. Intelligence flowing.",
  ],
  wednesday: [
    "Wednesday wisdom: orchestrate smarter.",
    "Wednesday! The sweet spot of the week.",
    "Wednesday: when genius emerges.",
    "Wednesday! Smart routing starts here.",
  ],
  thursday: [
    "Thursday throughput. Let's scale.",
    "Thursday momentum. Don't stop now.",
    "Thursday! When dreams become shipping code.",
    "Thursday orchestration: final details matter.",
  ],
  friday: [
    "Happy Friday, architect. Ship it!",
    "Friday! Shipping season is here.",
    "Happy Friday, dev. End strong.",
    "Friday! When builders become shippers.",
  ],
  saturday: [
    "Saturday sprint? Models are ready.",
    "Saturday coding. Pure bliss.",
    "Saturday! No distractions. Just orchestration.",
    "Saturday! The builder's favorite day.",
  ],
  sunday: [
    "Sunday session, developer?",
    "Sunday vibes. Calm coding.",
    "Sunday orchestration. Peak focus.",
    "Sunday! Intelligence refined and ready.",
  ],
  developer: [
    "Route. Orchestrate. Build.",
    "Let's orchestrate your brilliance.",
    "Intelligence orchestrated. Genius unleashed.",
    "Intelligent orchestration starts here.",
  ],
  inspirational: [
    "Build something that changes everything.",
    "Build the future. One chain at a time.",
    "Orchestrate your way to impossible.",
    "Let's make something extraordinary.",
  ],
  casual: [
    "Orchestration mode: activated.",
    "Plot twist: AI just got easier.",
    "Yo, let's route some intelligence.",
    "Plot twist: orchestration was the answer all along.",
  ],
  timeAgnostic: [
    "Let's route your intelligence.",
    "Ready to orchestrate?",
    "Intelligence starts here.",
    "Your models, elevated.",
    "Route smarter. Build faster.",
    "What are we building today?",
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
    poolKey = "casual";
  } else {
    const dayKey = dayNames[dayOfWeek];
    if (dayKey === "saturday" || dayKey === "sunday") {
      poolKey = seed % 3 === 0 ? dayKey : "casual";
    } else {
      poolKey = dayKey;
    }
  }

  const pool = headings[poolKey];
  const heading = pool[seed % pool.length];

  return { heading };
}
