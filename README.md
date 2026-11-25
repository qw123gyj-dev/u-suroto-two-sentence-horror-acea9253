[![make.fun](https://make.fun/badge/u-suroto-two-sentence-horror-acea9253.svg)](https://make.fun/bounty/u-suroto-two-sentence-horror-acea9253)
[![rank](https://make.fun/badge/u-suroto-two-sentence-horror-acea9253/qw123gyj-dev/u-suroto-two-sentence-horror-acea9253/rank.svg)](https://make.fun/bounty/u-suroto-two-sentence-horror-acea9253)
[![reward](https://make.fun/badge/u-suroto-two-sentence-horror-acea9253/qw123gyj-dev/u-suroto-two-sentence-horror-acea9253/reward.svg)](https://make.fun/bounty/u-suroto-two-sentence-horror-acea9253)

# Two-Sentence Horror

A horror story in exactly two sentences, under 400 characters, judged head to head by an AI judge on how frightening it is. `main.ts` (Node 22, stdlib only, no network) scores a fixed pool of five hand-written stories against the published judge brief — second-sentence turn, implied horror, precise prose, originality — with a freshness guard that strips originality points from any story leaning on a stock horror phrase, picks the winner deterministically (score, then shorter story, then pool order), and writes it to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`). It checks the winner is a single block of exactly two sentences within the 400-character limit, runs a self-test proving the validator rejects a 1-sentence text, a 3-sentence text and a 401-character text, proving the freshness guard strips a stock-phrase decoy to 0 originality and that the pick is the argmax and deterministic, then reads the file back and verifies the bytes match.

> "I finally taught my parrot to say goodnight before bed. Last night it said it twice — once from its cage, and once from under my bed."
