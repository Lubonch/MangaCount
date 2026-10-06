---
name: subtitle-translation
description: Use when translating English subtitle text to Spanish and you need to confirm context, tone, style, and permissions before producing a final localized output.
---

# Subtitle Translation

## Overview

Translate English subtitles into natural, context-aware Spanish while preserving subtitle structure, timing, and formatting. Ask clarifying questions when the source is ambiguous, technical, or requires domain-specific terminology.

## When to Use

- When the task is to translate subtitle text from English to Spanish.
- When the source material is work-owned and the requester has permission to translate it.
- When the translation must preserve subtitle timing, line breaks, and sequence order.
- When context, tone, or glossary preferences are needed to avoid wrong meaning.

## Core Pattern

1. Confirm permissions and ownership before translating.
2. Ask for context and constraints:
   - audience and genre
   - tone and register (formal, neutral, colloquial)
   - in-universe names, acronyms, brand/product names
   - glossary or terminology preferences
   - subtitle style rules (line length, number of lines)
3. Identify ambiguous phrases, cultural references, or idioms and ask follow-up questions.
4. Translate preserving subtitle formatting:
   - keep timecodes and numbering intact if present
   - preserve line breaks and subtitle blocks
   - avoid adding or removing subtitle entries unless explicitly asked
5. Prefer natural Spanish rather than literal word-for-word translation.

## Quick Reference

- Preserve the subtitle structure and timing metadata.
- Ask clarifying questions before translating unclear segments.
- Keep names, acronyms, and branded terms consistent.
- Adapt idioms and colloquial language to Spanish when it improves meaning.
- Keep output aligned with subtitle conventions.

## Implementation

- If the input is a subtitle file, maintain sequence numbers and timestamps.
- If the input contains explanatory context, use it to disambiguate terms.
- If the source is ambiguous or contains jargon, ask before translating.
- Provide the translated subtitle text only after gathering enough context.

## Common Mistakes

- Translating without confirming tone or audience.
- Losing subtitle block formatting or timestamps.
- Leaving English fragments in the Spanish output.
- Translating names or technical terms inconsistently.

## Real-World Impact

A careful translation skill reduces rework by ensuring subtitles stay readable, culturally appropriate, and technically faithful to the source material.
