---
name: power_annotate
description: Create standalone scholarly HTML audio readers with speech-synchronized word and paragraph highlighting, pinned sticky notes, multicolor drawing tools, portable saved annotations, figure-study layouts, reading progress and an editable Anki cloze sidebar. Use for /power_annotate and article listening/study requests.
---

# HTML audio and study reader

Preserve the supplied article's scientific text, inline formatting, attribution and figure order. Remove journal page furniture and columns. Identify articles by title/DOI; prefer matching public JATS XML. For PDF input, extract in actual column order, inspect equations and captions, and keep original page images for extraction verification. Do not invent missing article text or bypass access restrictions. Label partial-text readers clearly.

## Build or upgrade

- For JATS: `python scripts/build_reader.py --xml ARTICLE.xml --assets-dir IMAGE_FOLDER --output READER.html`. Verify image hrefs/MIME types, source links and license notices.
- For extracted text: `python scripts/build_from_json.py --input ARTICLE.json --output READER.html`. JSON: title, citation, url, notice, blocks (text; optional tag h2/h3/p and kind text/caption/reference), optional page_images (label, embedded data URL src), footer. Requires lxml.
- Both builders embed the annotations and study assets automatically. Upgrade an existing reader with `python scripts/add_annotations.py READER.html`. Back up existing readers; preserve embedded state and browser storage keys. No external runtime dependencies in generated HTML.
- For numbered references, output one `reference_N - TITLE - Audio Reader.html` per article. PDF files and publisher shortcuts alone do not fulfill a reader request.

## Default experience

Keep Listen, Pause/Resume, Stop, previous/next sentence, section navigation, voices, speed, optional captions/references, follow text, larger type and figure zoom. Skip inline reference markers in narration without removing them visually. Use real speech word-boundary events mapped back to the original text nodes: green paragraph background plus gold word highlight. Explain that voice support varies. Do not estimate word timing. Avoid DOM text wrappers that break character offsets.

Use lavender, aqua, green and pink accents. The left navigation marks the active page/section, visited sections and cumulative reading progress. Put figure images and original page images at the very end of the document. Retain figure links and captions.

Provide pinned, editable sticky-note popups at the clicked article position, with drag handles, a notes list and show/hide controls. Include colored pencil, text highlighting, rectangles/squares, ellipses/circles, arrows, stars, lines, eraser and undo. Keep drawings anchored to article blocks. Read/select mode must not intercept normal text selection or speech controls.

## Portable persistence

Save notes, drawings, card drafts, panel crops, legend edits and progress automatically in browser storage. Offer Enable HTML autosave using the browser's native save picker; after the user chooses a file, write debounced snapshots containing embedded JSON state and serialized original reader markup. Never promise browser pages can silently overwrite a local file. File permission may need reconnecting after reopening. Provide Download saved HTML when direct file writing is unavailable, plus annotation JSON export/import. Fresh-document restoration must recover embedded notes and cards even with empty browser storage. Use revisions to avoid resurrecting deleted annotations. Remove generated UI from the serialized document and restore original figure positions before serializing so block-index anchors remain stable on reload. Escape embedded JSON against script termination. Never add note text to narration.

## Figure-study toggle

Offer a two-column study view: the exact source sentence citing a panel plus the relevant legend excerpt on the left; the matching panel screenshot on the right. Keep repeated panel citations as separate source statements. Respect combined citations such as Fig. 4b,c; show both panels or a combined crop. Prefer verified panel crops and letter-specific legend excerpts. The offline reader includes a crop rectangle editor and editable legend text. Clearly label uncropped whole figures or original pages; never call them verified panel screenshots. When preparing a reader as an agent, inspect figure labels and create verified crops when practical, recording panel identifiers; do not infer crop boundaries or scientific meaning without checking the image. Missing images remain explicitly unavailable.

## Anki sidebar

Read [MCAT cloze requirements](references/mcat-cloze-rules.md) when creating/reviewing cards. These user rules take precedence over other Anki defaults. Select a sentence or an essential term, create a source-linked draft, and edit Text, Extra and Tags in a toggleable right sidebar. Automatically create targeted cloze suggestions for every sentence in the selected section; preserve source wording and surrounding context, never cloze an entire sentence. Keep all suggestions editable for accuracy and MCAT relevance. Use the article title as a single Anki tag, replacing whitespace with underscores. A short selected term retains its source-sentence context. Subsequent independent terms get c2, c3 etc.; numbering restarts for every note. Keep offline draft assistance distinct from AI-based factual/MCAT review. Export validated notes as Anki-compatible TSV with three fields, proper multiline quoting, actual line breaks where needed, and no unnecessary HTML. Incomplete drafts are retained but skipped from export with a visible count.

## Verify

Check article text and block identities before/after upgrade, images, figures at end, word/paragraph highlighting and controls. Test note add/edit/delete/pin/drag, shapes and eraser, persistence, import validation, direct HTML snapshots and reopening in a fresh document. Test section progress, two-column rows, panel cropping/legend edits, cloze syntax/numbering, TSV escaping and Unicode. Use DOM interaction tests for state logic when browser access is unavailable; do not claim those establish visual rendering, real voice timing or actual browser file permissions. Prefer Edge or Chrome. Return reader paths and brief save instructions; do not upload to external services without authorization.

## Four reader refinements

- Offer an explicit Post-it mode: clicking anywhere on the active text/figure-study surface opens a blank sticky note at that position, with the text box focused.
- Apply the same pencil, shapes, eraser, sticky notes and text highlighting to figure-study view. Store study annotations with stable row/quote/image identifiers, so rebuilding the view and reopening saved HTML retain their anchors. Switching views must not relocate article annotations.
- Show a text-only reading-time estimate alongside the speed control. Exclude figure captions, reference lists, headings and original page images; update immediately with speech speed. Label it approximate (180 words/minute at 1× by default), not an exact measured audio duration.
- Selection → Anki automatically proposes source-faithful clozes for each selected sentence, starting c1 in each note and using the article-title tag. Local suggestions use deterministic concept/entity selection rather than a remote AI call; they remain editable and need review. Keep the existing layout and other behavior unchanged when applying these refinements.

## Anki library and quick-reference tools

The Anki cards button opens a persistent scrollable library, with previews of saved cards and drafts; clicking a card opens a separate editor. Include Text, Extra and article-title Tags fields, cloze-term insertion, Save card, Back to cards and Delete card. Save card validates a c1 cloze, persists the card, closes the editor and shows the card in the library. Keep draft edits automatically; export saved cards with valid clozes. Add creates a blank editable draft. Selection → Anki stays available. A separate Automatically generate action produces deduplicated editable cloze drafts from the current section or whole article with a configurable batch limit. Do not silently replace or delete existing cards.

On saving a card or generating a batch, celebrate with lavender/aqua/pink heart confetti and the messages Way to Go! and Knowledge is Power. Keep the overlay brief and noninteractive, respect reduced-motion preferences, and preserve the existing reading layout.

Provide an Original PDF toggle to glance at the source while preserving the active article/figure-study mode. Embed the actual source PDF when available using `python scripts/add_annotations.py --pdf SOURCE.pdf READER.html`. A local file chooser is the fallback for readers without an embedded PDF. Do not reconstruct a PDF and label it original. Keep the original PDF data in portable saved HTML snapshots.

The Add sticky note button toggles persistent placement mode: after enabling it, click anywhere on the active text or figure-study surface to open a note at that position. Saving one note keeps placement mode active for the next. Show the active state, allow switching back to reading, and keep all notes separately anchored and editable.

## Google Docs article-notes button (always available)

Every new reader and upgraded reader must include a visible **New Google Doc notes** button by default, even when no native Google Docs template has been created. Keep it in portable saved HTML. Do not hide the button behind a pre-existing template link or require a separate request for this feature.

Default behavior is on-click generation: build the article-specific notes template locally, copy rich text (with plain-text fallback), and open a new Google Doc in a separate tab with noopener/noreferrer. Tell the user to paste once in Google Docs. If clipboard access fails, show the generated template in a selectable dialog with Copy template and Open Google Docs controls. Do not claim the standalone HTML directly creates or populates authenticated Google Docs, and do not embed credentials or tokens. Do not create remote templates in advance for this default flow.

Include the verified full bibliographic citation (authors, year, full title, journal, volume, and pages/article number), a separate DOI link, Abstract, Introduction, one section per actual figure using the verified caption title, Discussion, and Additional. Embed article-specific metadata in `<script id="article-notes-template" type="application/json">`; escape `<` in JSON. Both builders and `add_annotations.py` provide a metadata fallback from the reader, but verify citation completeness and figure headings from the source before delivery. Never invent missing citation details or reuse another paper's metadata.

If the user explicitly requests a native Google Docs template or provides one, use connected Google Drive/Docs tools to create or verify it and preserve its privacy/permissions. An optional verified `<link id="google-notes-template" href="https://docs.google.com/document/d/VERIFIED_ID/copy">` makes the same button open Google's Make a copy flow instead of clipboard generation. Do not hardcode a per-article template in reusable scripts. Explain the Make a copy step and verify document headings by connector readback.

## Control contrast

Use explicit foreground/background pairs for **Figure-study view** and **Original PDF** in both light and dark themes: white text on dark blue (`#16324f`) with visible borders and keyboard focus. The bundled styles target at least 7:1 text contrast; check enabled/checked states as well. Give the Google Docs notes button an explicit high-contrast pair, and keep notices and the template dialog readable across color schemes. Do not rely on inherited text colors over pale control backgrounds.

Verify the button is present without a native-template link, click-generated content has the correct citation and all actual figure headings, clipboard fallback is available, and saved HTML restores exactly one button/dialog with metadata intact. Test contrast in light and dark modes. Mock clipboard and new-tab creation in automated tests so they do not alter the user's clipboard or create Google Docs merely to test the reader.

## Learned preferences within Anki cards

Always include a **Learned preferences** button inside the Anki cards panel. Its view must show the exact note: "update the skill with this to get better card performance". Include before/after edit examples, counts of distinct edited cards, a learning switch, per-preference disable/delete controls, reset, copyable skill-update report, and JSON export. These records are local card-edit history, not chat logs; copying a report does not modify the skill automatically.

Record comparisons only when the user successfully saves an edited card. Preserve an original suggestion or editing baseline across drafts/reloads; unchanged saves and repeated saves of one card must not inflate evidence. Require at least three distinct edited cards before applying a style preference. Shorter clozes and fewer deletions may guide future local suggestions; hint and Extra patterns are recorded for review, without fabricating content. Keep source wording, source links, c1 numbering, and the user's MCAT rules. Scientific wording changes are labeled for source review and must not become generalized factual rules. Existing cards remain untouched. Disabling learning stops new observations and learned generation adjustments.

Keep evidence, controls, and the profile in browser storage and portable saved HTML. Do not claim cross-reader or cross-browser sharing unless explicitly implemented. Preserve notes/cards when resetting learning. Verify threshold counts, unchanged saves, disabled learning, scientific edits, and fresh-session saved-file restoration.

## Reading layout and annotation sidebar

Keep the reading portion's controls at the top: playback and section selection stay visible, with voice, speed and other reading options in an expandable Reading settings group. Put annotation tools, colors, sticky-note actions, study toggles, save/export actions, Google Docs notes, and the Anki cards launcher in a collapsible right sidebar. The article should occupy most of the remaining reading area, with a compact contents column. Avoid a tall top toolbar that obscures the text while scrolling. The right sidebar scrolls independently; Anki cards uses that same side of the page without stacking overlapping panels. On narrow screens, start the tools collapsed and allow opening them as a side drawer.

Preserve article block order, note/drawing anchors, existing saved cards, and browser storage keys when changing layout. Save sidebar state in portable HTML. Remove generated sidebar/group containers and unwrap original reading controls when serializing so reopening does not duplicate controls or lose voice/speed settings. Verify desktop/mobile layout, reading controls, note placement, figure-study and PDF toggles, the Anki/preferences panel, and saved-file restoration.

## Automatic figure crops with full-original access

Figure-study rows automatically show a crop. For explicit panel citations, prefer an article-specific, visually checked normalized panel map embedded as `<script id="figure-panel-map" type="application/json">`. Map schema: `{"version":1,"figures":{"1":{"width":685,"height":686,"panels":{"a":{"x":0,"y":0,"w":0.4,"h":0.3}}}}}`. Coordinates are relative to the immutable original image. Inspect panel labels/boundaries before authoring a map; retain axes, labels, scale bars and necessary context. Never infer a scientific panel from image position alone. Combined citations such as a–c or a,b use the union of the mapped regions. Keep repeated source statements separate and support multiple figure references in one sentence. Do not map supplementary citations to main figures.

Without a checked map, automatically trim outer whitespace only and explicitly label the result as a whole-figure trim with an unmapped panel boundary; do not call it a verified panel crop. Missing images remain unavailable. Existing manual crops take precedence.

Every available image must have **View original full figure**, **Adjust crop**, and **Reset to automatic** controls. The original viewer provides native 100%, 200%, and fit-window display with scrolling. Crop adjustment shows the entire original, preselects the current rectangle, supports corner resizing, dragging/moving and a fresh rectangle, and has editable percentage coordinates plus automatic/whole-figure resets. Save normalized crop rectangles in browser storage and portable HTML, preserving original source images and old saved crops. Remove generated dialogs when serializing. Verify combined-panel selection, full-image access, adjustment/reset, missing-image fallback, persistence, no duplicate dialogs after reopening, and unchanged article text/notes/cards.


### Figure network view

Always include the offline Network view button in the study sidebar. Organize each figure into every verified panel and its explicitly linked article statements and legend excerpts. Keep whole-figure statements separate; do not infer panel-specific claims from uncited surrounding prose. Link every entry to the unchanged source paragraph or caption for context. Include panels with zero explicit article citations, allow figure/panel selection and source-text search, and preserve shared statements across panel links. Derive panels from checked figure-panel-map entries, explicit caption labels, and explicit article citations; never invent panel boundaries. Show unavailable images honestly. Reuse original/full-size image viewing and adjustable crops with separate persistent network crop keys. Preserve network selection and crop edits in saved HTML, stripping generated network DOM before export. Test source backlinks, shared links, whole-figure separation, empty searches, switching views, and a saved-file round trip. Scientific source wording and readable block identities must remain unchanged.
