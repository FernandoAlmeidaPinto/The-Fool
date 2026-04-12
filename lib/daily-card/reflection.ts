export interface SplitReflection {
  pullQuote: string | null;
  body: string | null;
  firstLetter: string | null;
  bodyWithoutFirstLetter: string | null;
}

/**
 * Splits a cached `dailyReflection` HTML blob into editorial pieces:
 * a pull quote (first sentence), a body (the rest as plain text), and
 * the first alphabetical letter of the body pre-extracted for a drop
 * cap, plus the body with that letter removed.
 *
 * The AI provider currently returns `<p>...</p><p>...</p>` with at
 * most one `<strong>` tag per paragraph. We intentionally strip HTML
 * and render the body as plain text — see the design doc for why.
 *
 * Edge cases:
 * - Null / empty input → all fields null.
 * - Single sentence → pullQuote is that sentence, body is "".
 * - Body starts with punctuation → drop cap picks the first `\p{L}`
 *   match; the punctuation stays in `bodyWithoutFirstLetter`.
 * - No period found → pullQuote is the whole string, body is "".
 *
 * The sentence splitter is naively regex-based and will also split on
 * abbreviations like "Sr. Fulano". The current content doesn't produce
 * those — don't engineer around it until a real case appears.
 */
export function splitReflection(html: string | null): SplitReflection {
  if (!html) {
    return {
      pullQuote: null,
      body: null,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Strip HTML tags and collapse whitespace.
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) {
    return {
      pullQuote: null,
      body: null,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Split on the first period followed by whitespace.
  const parts = plain.split(/(?<=\.)\s+/);
  const pullQuote = parts[0].trim();
  const body = parts.slice(1).join(" ").trim();

  if (!body) {
    return {
      pullQuote,
      body: "",
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Find the first Unicode letter in the body.
  const letterMatch = body.match(/\p{L}/u);
  if (!letterMatch || letterMatch.index === undefined) {
    return {
      pullQuote,
      body,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  const idx = letterMatch.index;
  const firstLetter = body[idx];
  const bodyWithoutFirstLetter = body.slice(0, idx) + body.slice(idx + 1);

  return {
    pullQuote,
    body,
    firstLetter,
    bodyWithoutFirstLetter,
  };
}
