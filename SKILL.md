---
name: html_aud
description: Create standalone scholarly HTML audio readers with speech-synchronized word and paragraph highlighting, pinned sticky notes, multicolor drawing tools, portable saved annotations, figure-study layouts, reading progress and an editable Anki cloze sidebar. Use for /html_aud and article listening/study requests.
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

Read [MCAT cloze requirements](references/mcat-cloze-rules.md) when creating/reviewing cards. These user rules take precedence over other Anki defaults. Select a sentence or an essential term, create a source-linked draft, and edit Text, Extra and Tags in a toggleable right sidebar. A selected term can become c1 while the source sentence stays visible. Sentence selections open editable drafts; the user selects essential terms rather than hiding an entire sentence. Subsequent independent terms get c2, c3 etc.; numbering restarts for every note. Keep offline draft assistance distinct from AI-based factual/MCAT review. Export validated notes as Anki-compatible TSV with three fields, proper multiline quoting, actual line breaks where needed, and no unnecessary HTML. Incomplete drafts are retained but skipped from export with a visible count.

## Verify

Check article text and block identities before/after upgrade, images, figures at end, word/paragraph highlighting and controls. Test note add/edit/delete/pin/drag, shapes and eraser, persistence, import validation, direct HTML snapshots and reopening in a fresh document. Test section progress, two-column rows, panel cropping/legend edits, cloze syntax/numbering, TSV escaping and Unicode. Use DOM interaction tests for state logic when browser access is unavailable; do not claim those establish visual rendering, real voice timing or actual browser file permissions. Prefer Edge or Chrome. Return reader paths and brief save instructions; do not upload to external services without authorization.
