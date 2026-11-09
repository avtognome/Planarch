# Task 5 Brief: CSS & Theme Classes Clean Up

## Goal
Clean up CSS color variables in `src/theme.css` and `src/style.css` to define `--archeron-*` variables while maintaining `--planarch-*` aliases for backward compatibility. Update DESIGN.md to state Archeron.

## Requirements
1. In `src/theme.css`:
   - Define:
     - `--archeron-charcoal: #17191a;`
     - `--archeron-deep-charcoal: #101214;`
     - `--archeron-ivory: #f1e8d8;`
     - `--archeron-antique-gold: #be9454;`
     - `--archeron-gold-highlight: #e2bc7c;`
     - `--archeron-aged-gold: #826039;`
     - `--archeron-warm-ink: #302c27;`
   - Keep alias references:
     - `--planarch-charcoal: var(--archeron-charcoal);` etc.
2. In `DESIGN.md`:
   - Update header/title to Archeron.
3. Check `src/style.css` for any hardcoded `planarch` strings that should reference `archeron`.
4. Do NOT execute shell commands or tests yet. Write report to `.superpowers/sdd/task-5-report.md`.
