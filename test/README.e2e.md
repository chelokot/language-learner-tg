### E2E tests

These tests use `telegram-test-api` to spin a fake Telegram HTTP API and interact with a real `grammy` `Bot` instance. They also generate chat transcripts:

- JSON under `test/e2e/reports/*.json`
- PDF under `test/e2e/reports/*.pdf`

Run:

```
npm run test:e2e
```

Note: PDFs require system fonts available; CI may skip visual fidelity checks.


