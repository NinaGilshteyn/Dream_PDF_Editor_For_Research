# html_aud: HTML Audio and Study Reader

`html_aud` is an agent skill that turns a scholarly article into a **single, standalone HTML file** you can listen to, annotate, and study from. It needs no server, no accounts, and no external runtime dependencies. Open the file in Edge or Chrome and it works.

## Features

### Listen
- Listen, Pause/Resume, Stop, previous/next sentence, section jump, voice picker, and speed control
- Word-level highlighting driven by real speech word-boundary events (gold word on a green paragraph background). Timing is never estimated.
- Optional narration of captions and references; inline citation markers are skipped in narration but stay visible
- Follow-text scrolling, larger type, and figure zoom
- Left navigation with the active section, visited sections, and cumulative reading progress

Voice support varies by browser and operating system.

### Annotate
- Pinned, editable sticky notes anchored where you click, with drag handles, a notes list, and show/hide controls
- Colored pencil, text highlighter, rectangle, ellipse, arrow, star, line, eraser, and undo
- Drawings anchor to article blocks, and read/select mode never blocks normal text selection
- Note text is never read aloud

### Save your work (portable)
- Notes, drawings, card drafts, panel crops, legend edits, and progress save automatically to browser storage
- **Enable HTML autosave** uses the browser's native save picker to write snapshots back into your reader file. Permission may need reconnecting after you reopen it.
- **Download saved HTML** is the fallback where direct file writing is unavailable
- Annotation JSON export and import
- Annotations are embedded in the HTML, so they restore even when browser storage is empty

Browser pages cannot silently overwrite local files. The picker always needs your approval.

### Figure-study view
A two-column layout puts the sentence that cites a figure panel and its legend excerpt on the left, with the matching panel crop on the right.
- Repeated citations stay as separate rows, and combined citations like `Fig. 4b,c` show both panels
- Built-in crop-rectangle editor and editable legend text
- Uncropped figures and original pages are labeled as such, never as verified panel screenshots
- Missing images are marked unavailable

### Anki cloze sidebar
- Select a term or sentence to create a source-linked draft, then edit Text, Extra, and Tags in a toggleable sidebar
- Cloze numbering (`c1`, `c2`, ...) restarts for every note
- Exports Anki-compatible three-field TSV with proper multiline quoting; incomplete drafts are kept but skipped, with a visible count
- Card style follows [`references/mcat-cloze-rules.md`](references/mcat-cloze-rules.md)

Drafting is offline assistance. It does not call an AI model or verify scientific claims, so review cards before studying from them.

## Install

Copy this folder into your agent's skills directory (for example `~/.codex/skills/html_aud/`). Then ask:

```
Use $html_aud to turn this article into an HTML audio reader.
```

The skill also responds to `/html_aud` and to article listening or study requests.

## Usage

Python 3 is required. The JSON builder also needs `lxml`.

**From PMC/JATS XML:**
```bash
python scripts/build_reader.py --xml ARTICLE.xml --assets-dir IMAGE_FOLDER --output READER.html
```

**From extracted text (for example, a PDF):**
```bash
python scripts/build_from_json.py --input ARTICLE.json --output READER.html
```

```json
{
  "title": "Article title",
  "citation": "Authors. Journal. Year. DOI",
  "url": "https://doi.org/...",
  "notice": "Optional note, e.g. partial text",
  "blocks": [
    {"text": "Introduction", "tag": "h2"},
    {"text": "Paragraph text.", "tag": "p", "kind": "text"},
    {"text": "Figure 1. Caption.", "kind": "caption"}
  ],
  "page_images": [{"label": "Page 1", "src": "data:image/png;base64,..."}],
  "footer": "Optional footer"
}
```

**Upgrade an existing reader** with annotations and study tools (back it up first):
```bash
python scripts/add_annotations.py READER.html
```

## Repository layout

```
SKILL.md                      Skill definition and rules for the agent
agents/openai.yaml            Display name and default prompt
assets/                       Reader template, annotation and study CSS/JS
references/mcat-cloze-rules.md  Cloze card requirements
scripts/                      build_reader.py, build_from_json.py, add_annotations.py
```

## Principles

- Preserve the article's scientific text, inline formatting, attribution, and figure order
- Never invent missing text or bypass access restrictions, and label partial-text readers clearly
- Figures and original page images go at the end of the document
- Nothing is uploaded to external services without your authorization

## Rights

Readers are reading-format adaptations. Respect each article's license and consult the original for publication and rights information.
