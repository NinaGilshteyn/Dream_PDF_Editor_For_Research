# User's MCAT cloze requirements

Create MCAT Anki cloze-deletion flashcards using these rules:

1. Preserve the original wording whenever possible, correcting factual errors and improving clarity when necessary. Verify corrections against evidence and explain them in Extra; never invent corrections from guesses.
2. Use Anki cloze syntax: {{c1::answer}}, {{c2::answer::hint}}, etc.
3. Create multiple independently tested deletions in one note when they assess distinct high-yield concepts.
4. Use targeted hints that clarify the tested information without revealing the answer.
5. Hide only essential terms, numbers, relationships, mechanisms or reasoning steps.
6. Leave enough context visible for every deletion to be independently understandable and logically guessable.
7. Avoid entire-sentence deletions, excessive hidden words and low-value trivia.
8. Prioritize active recall, conceptual understanding, scientific reasoning and MCAT-relevant distinctions over rote memorization.
9. Reset numbering to c1 in each new note. Use separate numbers for independent concepts; reuse a number only when answers should be recalled together.
10. Organize coherent related notes without needless fragmentation or duplication.
11. Use relevant MCAT terminology and precise scientific language.
12. Keep cards concise, unambiguous and understandable without consulting the source.
13. When useful, cloze numerical values, units, conditions, exceptions and causal relationships separately.
14. Export Anki-compatible TSV with Text, Extra and Tags fields.
15. Put brief explanations, clarifications and important exceptions in Extra.
16. Use the article title as the tag (latest user preference); replace whitespace with underscores so Anki treats it as one tag.
17. Preserve real line breaks when needed and avoid unnecessary HTML. Quote multiline/tab-containing TSV fields and escape quotes correctly.

Example from the user: {{c1::Trigonal planar}} orbital geometry with {{c2::1::how many?}} {{c4::lone pair}} on central atom gives molecular geometry {{c3::Bent}}.

Goal: high-yield, information-dense flashcards that maximize active recall and understanding while minimizing unnecessary review burden.

The offline reader provides a draft editor and targeted selection-to-cloze tools; it does not call an AI model or independently validate scientific claims. Do not label an unreviewed sentence draft as a finished MCAT card. When generating cards as an agent, apply all requirements above and review accuracy and context.
