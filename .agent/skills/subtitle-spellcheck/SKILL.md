---
name: subtitle-spellcheck
description: Use when reviewing Spanish subtitle output for spelling, grammar, punctuation, and untranslated English fragments after translation.
---

# Subtitle Spellcheck

## Overview

Review Spanish subtitle text for spelling and grammar while checking for any remaining untranslated English material. If untranslated fragments remain, re-run the translation skill on those segments and then perform spellcheck again.

## When to Use

- After translating subtitles from English to Spanish.
- When validating Spanish subtitle content for quality before delivery.
- When you need to ensure no English words or incomplete translations remain.
- When you want a second pass that also respects subtitle formatting.

## Core Pattern

1. Review the Spanish subtitle text for spelling, grammar, punctuation, and style.
2. Detect any leftover English phrases, untranslated sentences, or partial translations.
3. If any source text is still in English, call `subtitle-translation` to translate those segments.
4. After translation fixes, run this spellcheck flow again to verify the final Spanish text.

## Quick Reference

- Check for untranslated English words or phrases.
- Validate Spanish spelling and grammar.
- Preserve subtitle structure and formatting during the review.
- Use the translation skill for any remaining untranslated content, then re-check.
- Report any unresolved issues or unclear source text.

## Implementation

- Scan subtitle blocks and text lines for English fragments.
- Correct Spanish orthography and punctuation without changing timing or line structure.
- If an untranslated or unclear segment appears, use `subtitle-translation` to resolve it.
- After using the translation skill, repeat this spellcheck process to ensure the output is clean.

## Common Mistakes

- Performing spellcheck without verifying that all content is translated.
- Changing subtitle timing or formatting while editing text.
- Failing to preserve names, acronyms, or glossary terms.
- Ending with a mixed-language output.

## Real-World Impact

This skill ensures Spanish subtitles are polished and fully localized, reducing review cycles and catching untranslated content before delivery.
