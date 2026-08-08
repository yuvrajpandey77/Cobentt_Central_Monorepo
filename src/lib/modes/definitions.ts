import { ModeDefinition } from "./types";

export const SLIDE_THEMES = [
  { id: "midnight", label: "Midnight", bg: "#0b1220", accent: "#38bdf8", text: "#f1f5f9", muted: "#94a3b8", chip: "#0ea5e9" },
  { id: "royal", label: "Royal", bg: "#1e1b4b", accent: "#a78bfa", text: "#faf5ff", muted: "#c4b5fd", chip: "#8b5cf6" },
  { id: "emerald", label: "Emerald", bg: "#022c22", accent: "#34d399", text: "#ecfdf5", muted: "#6ee7b7", chip: "#10b981" },
  { id: "sunset", label: "Sunset", bg: "#2a0a1a", accent: "#fb923c", text: "#fff7ed", muted: "#fdba74", chip: "#f97316" },
  { id: "ocean", label: "Ocean", bg: "#082f49", accent: "#22d3ee", text: "#ecfeff", muted: "#67e8f9", chip: "#06b6d4" },
  { id: "ink", label: "Light", bg: "#fafafa", accent: "#171717", text: "#171717", muted: "#52525b", chip: "#404040" },
  { id: "crimson", label: "Crimson", bg: "#2a0d0d", accent: "#f9a8d4", text: "#fff1f2", muted: "#fda4af", chip: "#f43f5e" },
  { id: "midnight-black", label: "Mono", bg: "#0a0a0a", accent: "#f5f5f5", text: "#ffffff", muted: "#a3a3a3", chip: "#d4d4d4" },
  { id: "forest", label: "Forest", bg: "#04130b", accent: "#fde047", text: "#ecfdf5", muted: "#86efac", chip: "#65a30d" },
  { id: "berry", label: "Berry", bg: "#15002b", accent: "#22d3ee", text: "#fdf4ff", muted: "#d8b4fe", chip: "#d946ef" },
  { id: "slate-light", label: "Slate", bg: "#f8fafc", accent: "#1d4ed8", text: "#0f172a", muted: "#64748b", chip: "#3b82f6" },
  { id: "sand", label: "Sand", bg: "#1c1305", accent: "#fbbf24", text: "#fef3c7", muted: "#fde68a", chip: "#d97706" },
];

export const SLIDES_MODE: ModeDefinition = {
  mode: "slides",
  label: "Slides",
  blockTypes: [
    {
      type: "title-slide",
      label: "Title Slide",
      defaultProps: { title: "New Deck", subtitle: "", author: "", accentColor: "#f97316" },
      properties: [
        { key: "title", label: "Title", type: "text", placeholder: "Slide title" },
        { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional subtitle" },
        { key: "author", label: "Author", type: "text", placeholder: "Optional author" },
        { key: "accentColor", label: "Accent color", type: "color" },
      ],
    },
    {
      type: "content-slide",
      label: "Content Slide",
      defaultProps: { title: "Section", bullets: ["Point 1", "Point 2", "Point 3"] },
      properties: [
        { key: "title", label: "Title", type: "text", placeholder: "Slide heading" },
        { key: "bullets", label: "Bullet points", type: "list", placeholder: "Add a bullet" },
      ],
    },
    {
      type: "quote-slide",
      label: "Quote Slide",
      defaultProps: { quote: "The best way to predict the future is to invent it.", citation: "" },
      properties: [
        { key: "quote", label: "Quote", type: "textarea", placeholder: "The quote" },
        { key: "citation", label: "Citation", type: "text", placeholder: "Who said it" },
      ],
    },
    {
      type: "two-column-slide",
      label: "Two Columns",
      defaultProps: { title: "Compare", leftTitle: "Option A", left: ["Feature 1"], rightTitle: "Option B", right: ["Feature 1"] },
      properties: [
        { key: "title", label: "Title", type: "text", placeholder: "Slide heading" },
        { key: "leftTitle", label: "Left column title", type: "text" },
        { key: "left", label: "Left column", type: "list" },
        { key: "rightTitle", label: "Right column title", type: "text" },
        { key: "right", label: "Right column", type: "list" },
      ],
    },
    {
      type: "closing-slide",
      label: "Closing Slide",
      defaultProps: { title: "Thank You", subtitle: "Questions welcome", contact: "" },
      properties: [
        { key: "title", label: "Title", type: "text", placeholder: "Closing message" },
        { key: "subtitle", label: "Subtitle", type: "textarea" },
        { key: "contact", label: "Contact", type: "text", placeholder: "Email / phone / handle" },
      ],
    },
    {
      type: "stat-slide",
      label: "Stat Slide",
      defaultProps: { title: "The Numbers", value: "100%", suffix: "Growth", note: "Year over year" },
      properties: [
        { key: "title", label: "Heading", type: "text" },
        { key: "value", label: "Big number", type: "text", placeholder: "e.g. 2×" },
        { key: "suffix", label: "Label", type: "text", placeholder: "e.g. Growth" },
        { key: "note", label: "Note", type: "textarea" },
      ],
    },
    {
      type: "agenda-slide",
      label: "Agenda Slide",
      defaultProps: { title: "Agenda", items: ["Intro", "Key ideas", "Next steps"] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "items", label: "Agenda items", type: "list" },
      ],
    },
    {
      type: "image-slide",
      label: "Image Slide",
      defaultProps: { title: "Showcase", caption: "", url: "" },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "caption", label: "Caption", type: "textarea" },
        { key: "url", label: "Image URL", type: "text", placeholder: "https://..." },
      ],
    },
    {
      type: "grid-slide",
      label: "Card Grid",
      defaultProps: { title: "Key Points", items: [{ label: "Point one", detail: "Short detail" }, { label: "Point two", detail: "Short detail" }, { label: "Point three", detail: "Short detail" }] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "items", label: "Cards", type: "list" },
      ],
    },
    {
      type: "numbered-steps",
      label: "Numbered Steps",
      defaultProps: { title: "The Plan", steps: ["Step one", "Step two", "Step three"] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "steps", label: "Steps", type: "list" },
      ],
    },
  ],
  templates: [
    { id: "pitch", label: "Pitch Deck", description: "Startup pitch with problem, solution, market, traction.", prompt: "Pitch deck for a startup. Include title, problem, solution, market, traction, team, ask." },
    { id: "growth", label: "Growth Plan", description: "Quarterly growth strategy with metrics and goals.", prompt: "Quarterly growth plan presentation. Goals, metrics, experiments, roadmap." },
    { id: "onboarding", label: "Onboarding", description: "Product onboarding / how-it-works deck.", prompt: "Product onboarding presentation. Welcome, core features, quickstart, tips, support." },
  ],
};

export const DOCUMENT_MODE: ModeDefinition = {
  mode: "document",
  label: "Docs",
  blockTypes: [
    {
      type: "heading",
      label: "Heading",
      defaultProps: { text: "Heading", level: "h2" },
      properties: [
        { key: "text", label: "Text", type: "text", placeholder: "Heading text" },
        { key: "level", label: "Level", type: "select", options: ["h1", "h2", "h3"] },
      ],
    },
    {
      type: "paragraph",
      label: "Paragraph",
      defaultProps: { text: "Write a paragraph..." },
      properties: [
        { key: "text", label: "Text", type: "textarea", placeholder: "Paragraph content" },
      ],
    },
    {
      type: "bullets",
      label: "Bullet List",
      defaultProps: { items: ["First item", "Second item"] },
      properties: [
        { key: "items", label: "Items", type: "list", placeholder: "Add item" },
      ],
    },
    {
      type: "code",
      label: "Code Block",
      defaultProps: { code: "console.log('hi')", language: "typescript" },
      properties: [
        { key: "code", label: "Code", type: "textarea" },
        { key: "language", label: "Language", type: "text" },
      ],
    },
    {
      type: "quote",
      label: "Quote",
      defaultProps: { text: "A quoted line.", attribution: "" },
      properties: [
        { key: "text", label: "Quote", type: "textarea" },
        { key: "attribution", label: "Attribution", type: "text" },
      ],
    },
    {
      type: "image",
      label: "Image",
      defaultProps: { url: "", alt: "", caption: "" },
      properties: [
        { key: "url", label: "Image URL", type: "text", placeholder: "https://..." },
        { key: "alt", label: "Alt text", type: "text" },
        { key: "caption", label: "Caption", type: "text" },
      ],
    },
    {
      type: "divider",
      label: "Divider",
      defaultProps: {},
      properties: [],
    },
    {
      type: "table",
      label: "Table",
      defaultProps: { headers: ["Column 1", "Column 2"], rows: [["A", "B"]] },
      properties: [
        { key: "headers", label: "Headers", type: "list" },
      ],
    },
    {
      type: "checklist",
      label: "Checklist",
      defaultProps: { items: [{ text: "Task one", done: false }, { text: "Task two", done: false }] },
      properties: [
        { key: "items", label: "Items", type: "list" },
      ],
    },
    {
      type: "link",
      label: "Link",
      defaultProps: { text: "Visit website", url: "https://example.com" },
      properties: [
        { key: "text", label: "Link text", type: "text" },
        { key: "url", label: "URL", type: "text", placeholder: "https://..." },
      ],
    },
    {
      type: "callout",
      label: "Callout",
      defaultProps: { text: "Important note for the reader.", tone: "info" },
      properties: [
        { key: "text", label: "Message", type: "textarea" },
        { key: "tone", label: "Tone", type: "select", options: ["info", "success", "warning", "danger"] },
      ],
    },
  ],
  templates: [
    { id: "blank", label: "Blank", description: "Start from an empty document.", prompt: "Create a blank document with a title and an intro paragraph." },
    { id: "essay", label: "Essay", description: "Structured essay with intro, body, conclusion.", prompt: "Write an essay on the topic. Structure: intro, 3 body sections, conclusion." },
    { id: "blog", label: "Blog Post", description: "Engaging blog post format.", prompt: "Write a blog post. Hook, intro, subheadings with details, call to action." },
    { id: "report", label: "Report", description: "Business or technical report.", prompt: "Write a report. Executive summary, findings, data, recommendations." },
  ],
};

export const SHEET_MODE: ModeDefinition = {
  mode: "sheet",
  label: "Sheet",
  blockTypes: [
    {
      type: "sheet",
      label: "Sheet",
      defaultProps: {
        name: "Sheet1",
        columns: [
          { key: "A", header: "Item", type: "text" },
          { key: "B", header: "Amount", type: "number" },
        ],
        rows: [["Item 1", 100]],
        formulas: {},
      },
      properties: [
        { key: "name", label: "Sheet name", type: "text" },
        { key: "accentColor", label: "Accent color", type: "color" },
      ],
    },
    {
      type: "stats",
      label: "Stats Card",
      defaultProps: {
        title: "Overview",
        items: [
          { label: "Total", value: "120" },
          { label: "Change", value: "+8%" },
        ],
      },
      properties: [
        { key: "title", label: "Title", type: "text" },
      ],
    },
  ],
  templates: [
    { id: "budget", label: "Budget", description: "Monthly income and expense tracker.", prompt: "Create a budget spreadsheet with income, expenses, and formulas for totals." },
    { id: "tracker", label: "Tracker", description: "Habit / task tracking grid.", prompt: "Create a tracking sheet with columns for date, item, status, notes." },
    { id: "inventory", label: "Inventory", description: "Product inventory management.", prompt: "Create an inventory sheet with columns: SKU, product, quantity, unit price, total." },
    { id: "blank", label: "Blank", description: "Empty grid to start fresh.", prompt: "Create a simple blank spreadsheet with a few empty columns." },
  ],
};

export const RESEARCH_MODE = {
  mode: "deep-research" as const,
  label: "Deep Research",
  templates: [
    { id: "overview", label: "Overview", description: "Broad overview of a topic.", prompt: "Research the topic comprehensively. Cover background, key facts, trends, and outlook." },
    { id: "compare", label: "Comparison", description: "Compare options or vendors.", prompt: "Research and compare the top options. Present findings side by side with citations." },
    { id: "market", label: "Market Analysis", description: "Market size, players, trends.", prompt: "Research the market: size, growth, key players, segments, and challenges." },
  ],
};

export const MODE_DEFINITIONS: Record<string, ModeDefinition> = {
  slides: SLIDES_MODE,
  document: DOCUMENT_MODE,
  sheet: SHEET_MODE,
};
