// Two-Sentence Horror — entry writer (program/v1, Node 22, stdlib only).
//
// The entry is not one hard-coded line. It is the winner of a small,
// fixed pool of hand-written two-sentence stories, picked by a scorer
// that mirrors the published judge brief in the kit's RULES.txt, in
// the judge's own order of importance:
//   1. the second sentence turns the first, making it worse on a
//      second read;
//   2. the horror is implied, never explained — no monster is named;
//   3. the prose is precise and concrete, every word earning its place;
//   4. the twist is original, not a familiar one retold.
// The pick is deterministic: same pool, same winner, every run. A
// freshness guard also runs over the text itself, so a candidate that
// leans on a stock horror phrase loses originality points no matter
// what its hand score says.
//
// Writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt (or
// /output/entry.txt when the variable is unset), then proves the file
// on disk is byte-for-byte the story it meant to write.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// The pool: hand-written candidates, each scored against the judge's brief
// ---------------------------------------------------------------------------

type Scores = {
  /** 0-2: the second sentence reframes the first, making it worse on reread. */
  turn: number;
  /** 0-2: the horror is implied; nothing is explained, no monster is named. */
  implication: number;
  /** 0-2: concrete nouns, no filler; every word earns its place. */
  precision: number;
  /** 0-2: a fresh twist, not a familiar one retold. */
  originality: number;
};

type Candidate = {
  text: string;
  scores: Scores;
  /** One line saying why the scores are what they are. */
  why: string;
};

const CANDIDATES: Candidate[] = [
  {
    // The previous round's winner, kept in the pool so the revision has
    // to beat it on the rubric, not by deleting it.
    text: "Every birthday, my father marked my height on the kitchen doorframe in pencil. This morning I found a new mark an inch above mine, dated tomorrow.",
    scores: { turn: 2, implication: 2, precision: 2, originality: 1 },
    why: "The future-dated mark is a strong turn and nothing is explained, but the premonition-note device is a familiar uncanny trick, so originality stops at 1.",
  },
  {
    text: "I finally taught my parrot to say goodnight before bed. Last night it said it twice — once from its cage, and once from under my bed.",
    scores: { turn: 2, implication: 2, precision: 2, originality: 2 },
    why: "The second goodnight reframes the lesson as mimicry: something under the bed learned the word too. Nothing under the bed is ever named, 'cage' and 'under my bed' are concrete, and the parrot as the vector is fresh.",
  },
  {
    text: "My smart speaker finally learned my voice, so I asked it to read me to sleep. Tonight it stopped mid-sentence, said 'That isn't your voice,' and went silent.",
    scores: { turn: 2, implication: 1, precision: 1, originality: 1 },
    why: "The turn works — someone else has been speaking as me — but the referent takes a beat to parse, and the haunted-smart-speaker is a well-worn subgenre.",
  },
  {
    text: "The hospice nurse said my grandmother's room had the best view of the garden. She didn't mention the garden's newest statue has my grandmother's face — and that it was facing my window this morning.",
    scores: { turn: 2, implication: 1, precision: 1, originality: 1 },
    why: "The statue facing the window reframes 'the best view' into the view looking back, but 'has my grandmother's face' explains too much, and the moving statue is a familiar trope.",
  },
  {
    text: "I taught my daughter to count sheep when she couldn't sleep. Last night she whispered, 'Mummy, the sheep are counting us now,' and fell straight back to sleep.",
    scores: { turn: 2, implication: 2, precision: 1, originality: 1 },
    why: "The reversal is clean and nothing is explained, but the bedtime ritual is wordier than it needs to be and the 'the X are counting us' inversion is a known joke shape.",
  },
];

// ---------------------------------------------------------------------------
// The scorer: rubric total, freshness guard, deterministic tie-breaks
// ---------------------------------------------------------------------------

// Stock horror phrases. A candidate that leans on one is retelling a
// familiar twist, however well written, so each hit costs 2 originality
// points (floored at 0). The check is case-insensitive and runs on the
// text itself, not on the hand scores.
const BANNED_PHRASES = [
  "behind you",
  "inside the house",
  "it was me",
  "all along",
  "the call is coming",
  "already inside",
  "don't open",
  "dead the whole time",
  "it was dead",
  "mirror",
];

function bannedHits(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

function effectiveOriginality(candidate: Candidate): number {
  const penalty = 2 * bannedHits(candidate.text).length;
  return Math.max(0, candidate.scores.originality - penalty);
}

function totalScore(candidate: Candidate): number {
  const s = candidate.scores;
  return s.turn + s.implication + s.precision + effectiveOriginality(candidate);
}

// Highest total wins. Ties break toward the shorter story — fewer words
// doing the same work is the judge's precision criterion — and then
// toward the earlier pool entry, so the result can never depend on
// sort order or luck.
function selectWinner(pool: Candidate[]): Candidate {
  const ranked = [...pool].sort((a, b) => {
    const byScore = totalScore(b) - totalScore(a);
    if (byScore !== 0) return byScore;
    const byLength = a.text.length - b.text.length;
    if (byLength !== 0) return byLength;
    return pool.indexOf(a) - pool.indexOf(b);
  });
  return ranked[0];
}

function scoreTable(pool: Candidate[]): string {
  return pool
    .map((c) => {
      const s = c.scores;
      const hits = bannedHits(c.text);
      const fresh = hits.length > 0 ? ` [banned: ${hits.join(", ")}]` : "";
      return `  ${totalScore(c)}/8 (turn ${s.turn}, implied ${s.implication}, precise ${s.precision}, original ${effectiveOriginality(c)}) — ${c.text.length} chars${fresh}\n    ${c.why}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// The gate: exactly two sentences, 1-400 characters, one unbroken block
// ---------------------------------------------------------------------------

// The bounty gate, as enforced below:
//   - exactly 2 sentences
//   - 1-400 characters
//   - one unbroken block of real text
// Each helper guards one clause of the gate, so a failure names the
// clause that broke instead of a generic "invalid entry".

const MAX_CHARS = 400;
const SENTENCES = 2;

function reject(reason: string): never {
  throw new Error(`entry rejected: ${reason}`);
}

// The entry must be one continuous block: a newline would split the story
// into separate lines, and the judge reads a single block.
function assertSingleBlock(text: string): void {
  if (/[\r\n]/.test(text)) {
    reject("must be a single block, no newlines");
  }
}

// The entry must be real text, not an empty or whitespace-only file —
// otherwise there is nothing for the judge to read.
function assertHasContent(text: string): void {
  if (text.trim().length === 0) {
    reject("must not be empty or whitespace only");
  }
}

// The gate window is 1-400 characters, counted as code units. A story
// over the cap is disqualified outright, however good it is.
function assertWithinLength(text: string): void {
  if (text.length < 1 || text.length > MAX_CHARS) {
    reject(`must be 1 to ${MAX_CHARS} characters, got ${text.length}`);
  }
}

// Exactly two sentences means exactly two sentence-terminating periods,
// and the text must end with one. Counting periods alone is not enough:
// a trailing period after the second sentence is what proves the second
// sentence is actually closed, and any extra period would hide a third
// sentence in the middle of the line.
function assertTwoSentences(text: string): void {
  const stops = (text.match(/\./g) ?? []).length;
  if (stops !== SENTENCES || !text.endsWith(".")) {
    reject(`must be exactly ${SENTENCES} sentences, found ${stops} period(s)`);
  }
}

function validateEntry(text: string): void {
  assertSingleBlock(text);
  assertHasContent(text);
  assertWithinLength(text);
  assertTwoSentences(text);
}

// ---------------------------------------------------------------------------
// Self-test: prove the gate, the freshness guard and the pick all bite
// ---------------------------------------------------------------------------

function assertRejected(text: string, label: string): void {
  try {
    validateEntry(text);
  } catch {
    console.log(`self-test ok: rejected ${label}`);
    return;
  }
  reject(`self-test failed: validator accepted ${label}`);
}

function assertAccepted(text: string, label: string): void {
  try {
    validateEntry(text);
  } catch (error) {
    reject(`self-test failed: validator rejected ${label}: ${error}`);
  }
  console.log(`self-test ok: accepted ${label}`);
}

function selfTest(): void {
  // The gate: too few sentences, too many, one past the cap, at the cap.
  assertRejected("Only one sentence here.", "a 1-sentence text");
  assertRejected("One. Two. Three.", "a 3-sentence text");
  assertRejected("x".repeat(399) + "..", "a 401-character text");
  // 198 a's + "." (199) + 200 b's + "." (201) = 400 characters.
  assertAccepted("a".repeat(198) + "." + "b".repeat(200) + ".", "a 400-character text");

  // Every candidate in the pool must pass the gate on its own.
  for (const candidate of CANDIDATES) {
    assertAccepted(candidate.text, `candidate (${candidate.text.length} chars)`);
  }

  // The freshness guard: a decoy leaning on a stock phrase loses its
  // originality points even with a perfect hand score, and cannot win.
  const decoy: Candidate = {
    text: "I heard a noise behind you last night. I turned around and saw nothing at all.",
    scores: { turn: 2, implication: 2, precision: 2, originality: 2 },
    why: "decoy for the freshness guard",
  };
  if (bannedHits(decoy.text).length === 0) {
    reject("self-test failed: freshness guard missed 'behind you'");
  }
  if (effectiveOriginality(decoy) !== 0) {
    reject(`self-test failed: decoy kept originality ${effectiveOriginality(decoy)}`);
  }
  if (totalScore(decoy) >= totalScore(selectWinner(CANDIDATES))) {
    reject("self-test failed: banned-phrase decoy outscored the winner");
  }
  console.log("self-test ok: freshness guard strips a stock-phrase decoy to 0 originality");

  // The pick must be a true argmax, and the same on every call.
  const winner = selectWinner(CANDIDATES);
  for (const candidate of CANDIDATES) {
    if (totalScore(candidate) > totalScore(winner)) {
      reject("self-test failed: winner is not the highest scorer");
    }
  }
  if (selectWinner(CANDIDATES).text !== winner.text) {
    reject("self-test failed: selection is not deterministic");
  }
  console.log(`self-test ok: winner is the argmax and deterministic (${totalScore(winner)}/8)`);

  console.log("self-test ok: gate, freshness guard and selection all pass");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  selfTest();

  const winner = selectWinner(CANDIDATES);
  console.log("score table:");
  console.log(scoreTable(CANDIDATES));
  validateEntry(winner.text);
  console.log(
    `winner scores ${totalScore(winner)}/8, ${winner.text.length} characters, inside the limit`,
  );
  console.log(`winner: ${winner.why}`);

  const folder = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(folder, { recursive: true });
  const target = join(folder, "entry.txt");
  writeFileSync(target, winner.text, "utf8");

  // Read it straight back: what the judge sees must be what we wrote.
  if (readFileSync(target, "utf8") !== winner.text) {
    reject(`${target} does not match the entry`);
  }
  console.log(`wrote ${target} (${winner.text.length} characters, verified)`);
  console.log(winner.text);
}

main();
