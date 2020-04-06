All commits should have one of the following prefixes: REL, FIX, ADD, TST, OPS, DOC. For example `"ADD: new feature"`.

Commits should be atomic: one commit - one feature, one commit - one bugfix etc.

When you tag a new release, use the following example:
`git tag -m "REL v1.4.0: 157c9c2" v1.4.0`
You may get the commit hash from git log. Don't forget to push tags `git push origin --tags`

When tagging a new release, make sure to increment version in package.json and other files (we have a script for that: `./edit-version-number.sh`)  
In the commit where you up version you can have the commit message as
`"REL vX.X.X: Summary message"`.
