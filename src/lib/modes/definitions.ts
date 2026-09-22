import { ModeDefinition } from "./types";
import { DYNAMIC_SLIDE_THEMES, toLegacyPalette } from "./slide-themes";

// Legacy 6-field palette kept for pptx-era consumers; the canvas + exports
// resolve the full dynamic theme via getSlideTheme().
export const SLIDE_THEMES = DYNAMIC_SLIDE_THEMES.map((t) => ({ id: t.id, label: t.label, ...toLegacyPalette(t) }));

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
    {
      type: "statement-slide",
      label: "Statement",
      defaultProps: { overline: "The takeaway", headline: "One powerful sentence.", sub: "" },
      properties: [
        { key: "overline", label: "Overline", type: "text", placeholder: "Small eyebrow label" },
        { key: "headline", label: "Headline", type: "textarea", placeholder: "The single message" },
        { key: "sub", label: "Supporting line", type: "textarea", placeholder: "Optional secondary line" },
      ],
    },
    {
      type: "editorial-slide",
      label: "Editorial",
      defaultProps: { overline: "Context", headline: "The headline", lede: "Opening line.", body: "Supporting paragraph.", stat: "", statLabel: "" },
      properties: [
        { key: "overline", label: "Overline", type: "text" },
        { key: "headline", label: "Headline", type: "text", placeholder: "Display headline" },
        { key: "lede", label: "Lede", type: "textarea", placeholder: "Opening line" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Supporting paragraph" },
        { key: "stat", label: "Side statistic", type: "text", placeholder: "e.g. 4.2×" },
        { key: "statLabel", label: "Stat label", type: "text", placeholder: "What the number means" },
      ],
    },
    {
      type: "media-split-slide",
      label: "Media Split",
      defaultProps: { title: "Showcase", body: "Short supporting copy.", bullets: ["Point one", "Point two"], url: "", ratio: "50-50", imageSide: "right" },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "body", label: "Body", type: "textarea" },
        { key: "bullets", label: "Bullets", type: "list" },
        { key: "url", label: "Image URL", type: "text", placeholder: "https://..." },
        { key: "ratio", label: "Split ratio", type: "select", options: ["50-50", "60-40", "40-60", "65-35", "35-65"] },
        { key: "imageSide", label: "Image side", type: "select", options: ["right", "left"] },
      ],
    },
    {
      type: "bleed-slide",
      label: "Full Bleed",
      defaultProps: { title: "A defining moment", subtitle: "", url: "" },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "subtitle", label: "Subtitle", type: "textarea" },
        { key: "url", label: "Background image URL", type: "text", placeholder: "https://..." },
      ],
    },
    {
      type: "timeline-slide",
      label: "Timeline",
      defaultProps: { title: "The Journey", items: [{ date: "2024", label: "Started", detail: "" }, { date: "2025", label: "Launched", detail: "" }, { date: "2026", label: "Scaled", detail: "" }] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "items", label: "Milestones", type: "object-list", itemFields: [{ key: "date", label: "Date" }, { key: "label", label: "Label" }, { key: "detail", label: "Detail" }] },
      ],
    },
    {
      type: "process-slide",
      label: "Process Flow",
      defaultProps: { title: "How it works", direction: "horizontal", steps: [{ label: "Input", detail: "" }, { label: "Process", detail: "" }, { label: "Output", detail: "" }] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "direction", label: "Direction", type: "select", options: ["horizontal", "vertical"] },
        { key: "steps", label: "Stages", type: "object-list", itemFields: [{ key: "label", label: "Stage" }, { key: "detail", label: "Detail" }] },
      ],
    },
    {
      type: "compare-slide",
      label: "Comparison",
      defaultProps: { title: "Compare", variant: "vs-split", leftTitle: "Before", left: ["Old way"], rightTitle: "After", right: ["New way"], verdict: "" },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "variant", label: "Variant", type: "select", options: ["vs-split", "before-after", "pros-cons", "table", "migration"] },
        { key: "leftTitle", label: "Left title", type: "text" },
        { key: "left", label: "Left items", type: "list" },
        { key: "rightTitle", label: "Right title", type: "text" },
        { key: "right", label: "Right items", type: "list" },
        { key: "verdict", label: "Verdict line", type: "text", placeholder: "Optional bottom line" },
      ],
    },
    {
      type: "chart-slide",
      label: "Chart",
      defaultProps: { title: "Growth", chartType: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], values: ["12", "24", "38", "61"], note: "" },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "chartType", label: "Chart type", type: "select", options: ["bar", "line", "donut"] },
        { key: "labels", label: "Labels", type: "list" },
        { key: "values", label: "Values (numbers)", type: "list" },
        { key: "note", label: "Note", type: "text" },
      ],
    },
    {
      type: "diagram-slide",
      label: "Diagram",
      defaultProps: { title: "Architecture", direction: "horizontal", nodes: [{ label: "Frontend", detail: "" }, { label: "API", detail: "" }, { label: "Database", detail: "" }], edges: [{ from: 0, to: 1, label: "" }, { from: 1, to: 2, label: "" }] },
      properties: [
        { key: "title", label: "Title", type: "text" },
        { key: "direction", label: "Direction", type: "select", options: ["horizontal", "vertical", "hub"] },
        { key: "nodes", label: "Nodes", type: "object-list", itemFields: [{ key: "label", label: "Label" }, { key: "detail", label: "Detail" }] },
        { key: "edges", label: "Connections (node indices)", type: "object-list", itemFields: [{ key: "from", label: "From #" }, { key: "to", label: "To #" }, { key: "label", label: "Label" }] },
      ],
    },
  ],
  templates: [
    { id: "pitch", label: "Venture", description: "High-contrast founder story for a confident pitch.", prompt: "Pitch deck for a startup. Include title, problem, solution, market, traction, team, ask.", theme: "midnight", designDirection: "Cinematic dark canvas, electric-blue accents, oversized type, sparse high-impact slides." },
    { id: "growth", label: "Signal", description: "Sharp strategy deck with a data-led editorial rhythm.", prompt: "Quarterly growth plan presentation. Goals, metrics, experiments, roadmap.", theme: "ocean", designDirection: "Editorial data-storytelling: large metrics, clean contrast, deliberate empty space, no repetitive cards." },
    { id: "onboarding", label: "Orbit", description: "Friendly product story with an energetic guided flow.", prompt: "Product onboarding presentation. Welcome, core features, quickstart, tips, support.", theme: "emerald", designDirection: "Warm product narrative with simple diagrams, generous spacing, playful but restrained visual motifs." },
    { id: "editorial", label: "Editorial", description: "Magazine-like typography for ideas that need authority.", prompt: "A thoughtful editorial presentation with a strong thesis and supporting evidence.", theme: "ink", designDirection: "Minimal editorial art direction: black ink on soft paper, asymmetric typography, elegant whitespace, each slide feels composed rather than templated." },
    { id: "brutalist", label: "Brutalist", description: "Raw, loud, typographic and impossible to ignore.", prompt: "A provocative point-of-view presentation with a clear argument and decisive conclusion.", theme: "crimson", designDirection: "Neo-brutalist poster design: huge type, hard geometry, intentional contrast, sparse copy, bold visual hierarchy." },
    { id: "aurora", label: "Aurora", description: "Iridescent gradients for a future-facing reveal.", prompt: "A future-facing presentation that introduces a new concept, product, or vision.", theme: "royal", designDirection: "Luminous aurora gradients, deep indigo field, glassy highlights, cinematic reveal pacing, premium technology feel." },
    { id: "luxury", label: "Atelier", description: "Quiet luxury for premium brands and crafted stories.", prompt: "A premium brand presentation focused on craft, positioning, and a memorable story.", theme: "sand", designDirection: "Luxury editorial presentation: restrained palette, precise typography, generous negative space, subtle gold-like warmth, never busy." },
    { id: "neo-memphis", label: "Memphis", description: "Optimistic color and kinetic shapes for fresh launches.", prompt: "An energetic launch presentation with a clear narrative, benefits, and call to action.", theme: "sunset", designDirection: "Neo-Memphis visual language: lively color, playful geometric composition, varied layouts, concise copy, high energy without clutter." },
    { id: "glass", label: "Glass", description: "Soft translucent layers for polished modern storytelling.", prompt: "A polished product or company presentation with a modern visual story.", theme: "berry", designDirection: "Dark glassmorphism with translucent layers, violet highlights, soft depth, elegant title slides, varied content pacing." },
    { id: "mono", label: "Monograph", description: "Sophisticated monochrome for ideas that should feel iconic.", prompt: "A concise thought-leadership presentation with a memorable opening and clear argument.", theme: "midnight-black", designDirection: "Monochrome art direction: striking black-and-white contrast, large type, one idea per slide, gallery-like calm." },
    { id: "forest", label: "Field Notes", description: "Grounded research style for strategy and sustainability.", prompt: "A research-backed presentation with evidence, implications, and practical next steps.", theme: "forest", designDirection: "Field-notes aesthetic: deep natural tones, warm highlights, evidence-forward layouts, clear source-conscious visual hierarchy." },
    { id: "blueprint", label: "Blueprint", description: "Precise technical clarity for complex products and systems.", prompt: "A technical product presentation explaining architecture, trade-offs, and next steps.", theme: "slate-light", designDirection: "Modern technical blueprint: crisp light surface, cobalt accents, structured diagrams and comparisons, minimal ornament." },
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
