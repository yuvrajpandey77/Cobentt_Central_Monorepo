import { ModeDefinition } from "./types";

export const SLIDES_MODE: ModeDefinition = {
  mode: "slides",
  label: "Slides",
  blockTypes: [
    {
      type: "title-slide",
      label: "Title Slide",
      defaultProps: { title: "New Deck", subtitle: "", author: "" },
      properties: [
        { key: "title", label: "Title", type: "text", placeholder: "Slide title" },
        { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional subtitle" },
        { key: "author", label: "Author", type: "text", placeholder: "Optional author" },
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
      type: "table",
      label: "Table",
      defaultProps: { headers: ["Column 1", "Column 2"], rows: [["A", "B"]] },
      properties: [
        { key: "headers", label: "Headers", type: "list" },
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
