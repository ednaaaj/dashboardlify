# Copy pass (opt-in)

Runs only when the user passes `--copy`. Edits JSX string literals (headings, labels, button text, empty-state lines, sample data). Never touches logic, props, keys, handlers or class names.

## Rules

1. Page title names the context (the page or the period), not a greeting.
   `Welcome back, Sam!` -> `Overview, last 30 days`
2. No exclamation marks. No emoji in labels or headings.
   `Great job! 🎉` -> `Goal reached`
3. Short labels.
   `Search anything...` -> `Search`; `Click here to view all` -> `View all`
4. Every delta states its comparison.
   `+12.5%` -> `+12.5% vs last month`
5. No hype words: supercharge, seamless, unlock, magic, game-changing, "AI-powered" stuck on everything.
   `Unlock seamless reporting` -> `Reports`
6. Sentence case, no trailing periods on labels, buttons and headings.
   `Create New Project.` -> `Create new project`
7. Sample data looks real and irregular: uneven amounts, varied name lengths, odd times.
   `$1,000 / $2,000 / $3,000` -> `$1,284.50 / $912.00 / $3,047.25`
8. Unverifiable claims are listed for the user, never silently rewritten or invented.
   `Loved by 10,000+ teams` -> report it: "claim at Hero.jsx:42, needs a source or removal"
9. Keep product terminology untouched. If the app uses i18n keys, edit the string in its source file (locale JSON) and never inline-translate or replace a `t('key')` call with literal text.

## Report

List every string changed as `file:line | before -> after`, then the unverifiable claims found.
