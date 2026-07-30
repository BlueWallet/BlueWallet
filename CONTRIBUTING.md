## Commits

All commits should have one of the following prefixes: REL, FIX, ADD, REF, TST, OPS, DOC. For example `"ADD: new feature"`.
Adding new feature is ADD, fixing a bug is FIX, something related to infrastructure is OPS etc. REL is for releases,  REF is for 
refactoring, DOC is for changing documentation (like this file).

Commits should be atomic: one commit - one feature, one commit - one bugfix etc.

## Releases

When you tag a new release, use the following example:
`git tag -m "REL v1.4.0: 157c9c2" v1.4.0 -s`
You may get the commit hash from git log. Don't forget to push tags `git push origin --tags`

Alternative way to tag: `git tag -a v6.0.0 2e1a00609d5a0dbc91bcda2421df0f61bdfc6b10 -m "v6.0.0" -s`

When tagging a new release, make sure to increment version in package.json and other files (we have a script for that: `./scripts/edit-version-number.sh`)  
In the commit where you up version you can have the commit message as
`"REL vX.X.X: Summary message"`.

## Guidelines

Do *not* add new dependencies. Bonus points if you manage to actually remove a dependency.

Bumped production dependencies must be pinned.

All new files must be in typescript. Bonus points if you convert some of the existing files to typescript.

New components must go in `components/`. Bonus points if you refactor some of old components in `BlueComponents.js` to separate files.

Add tests if it makes sense. Bonus points for e2e tests.

Added / modified texts should be only in `loc/en.json` - there should be no inline texts in UI code. Dont touch other localization json files - those are modified outside by Transifex.

Make sure the code is not overengineered and not bloated.

Aim for the absolute minimal change that does the job while still being readable.

If you added / altered tests, make sure they are not bullshit: dont just test mocks, or that data youve put into mocks is there; tests should check happy paths as well as edge cases and NOT be bloated / overengineered.

Dont touch lines that are not relevant to the change - they show up in the diff and distract, plus hijack line ownership in `git blame`.

# PRs

Before creating a PR, make sure unit/integration/lint tests pass. You might not have all env variables but thats ok - some tests will be skipped.

PRs must have short description of why (it was implemented) and how (it works under the hood).

When submitting PR with a UI (or visual) change it must include screenshot (from the emulator or the device) how the proposed change looks, even better - a video.
