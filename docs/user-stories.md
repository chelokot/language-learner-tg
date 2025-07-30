# User Stories

## Basic Vocabulary Training

As a new user I want to create my own word base so that I can train translations.

1. I open `/menu` and see an empty list of word bases with a `Create base` button.
2. I press **Create base** and enter a name for the base.
3. The bot confirms creation and shows the base in the list.
4. I open the base and add several words by providing front and back text.
5. I start an exercise for this base. The bot asks me to translate a random word.
6. I answer a few correctly and a few incorrectly and receive feedback each time.

This scenario is covered by end‑to‑end tests under `test/e2e`.
