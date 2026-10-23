<!-- Thanks for contributing to AyaSib. Please fill this in and delete the hints. -->

## What does this PR do?
<!-- One or two sentences. Link the issue it closes. -->

Closes #

## Type of change
- [ ] Knowledge base (`kb`)
- [ ] Glossary / Cebuano content
- [ ] Evaluation set (`eval`)
- [ ] Frontend
- [ ] Backend
- [ ] Docs
- [ ] Bug fix
- [ ] Chore / tooling

## Checklist
- [ ] The change does what the linked issue describes
- [ ] Tests added or updated for new behaviour
- [ ] No secrets, keys, or personal data in the diff
- [ ] Docs updated if behaviour, setup, or the API changed
- [ ] If the API changed, `docs/APIContract.md` is updated and the other side was told

## Checks I ran
<!-- Paste the relevant results. -->
- [ ] `npm run kb:validate` (backend) — if KB changed
- [ ] `npm run eval` (backend) — if KB or Ask logic changed
- [ ] `npm run lint` (frontend)
- [ ] `npm test` (frontend)
- [ ] `npm run build` (frontend)

## Knowledge-base entries only
<!-- Remove this section if not a KB change. -->
- [ ] Every new/edited file has `source_title`, `source_url`, and a real `last_verified` date
- [ ] The source is an **official** government page (link it below)
- [ ] No fact was guessed; unverifiable fields are `null` or omitted
- [ ] Cebuano `_ceb` fields written/reviewed by a native speaker, or PR marked `needs-native-review`

Source(s):

## Notes for reviewers
<!-- Anything that needs attention: tradeoffs, follow-ups, screenshots for UI changes. -->
