## Summary

<!-- One or two sentences. What changed, and why. -->

## Affected Skills

<!-- List the skill(s) this PR touches. Delete the section if none. -->

- `skills/<category>/<skill-name>/`

## Type of Change

<!-- Delete the ones that don't apply. -->

- New skill
- Edit to existing skill
- Fix (typo, broken link, incorrect snippet)
- Infrastructure / tooling (scripts, CI, workflows)
- Docs (README, CONTRIBUTING, etc.)

## Checklist

- [ ] `npm run validate` passes
- [ ] If skill cross-references changed, I ran `npm run update-deps -- --scan-deps` and committed the updated `skill-deps.json`
- [ ] If I added a new skill, I registered it in `.claude-plugin/plugin.json`
- [ ] No customer-identifying content (names, internal repos, absolute local paths, internal ticket IDs) in the skill content
- [ ] (Optional) `npm run evaluate -- --skill <name>` passed locally for touched skills
