# User Stories

## Basic Vocabulary Training

As a new user I want to create my own vocabulary so that I can train translations.

1. I open `/menu` and choose **Vocabularies**.
2. I press **Create vocabulary** and enter a name.
3. The bot confirms creation and shows it in the list.
4. I open the vocabulary, add a few words and finish with `/stop`. The bot returns to the main menu.
5. I select this vocabulary and start the **Word translation** exercise from the menu.
6. The bot keeps sending words until I reply `/stop`, gives feedback, and then shows the menu again.

This scenario is covered by end‑to‑end tests under `test/e2e`.
Each run captures the entire chat transcript and saves a Telegram‑style PDF in
`test/e2e/reports`. The CI workflow uploads each PDF as its own artifact so it can be
downloaded directly from GitHub Actions.
