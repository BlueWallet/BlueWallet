# Contribution Guidelines

Below are the guidelines for new and existing contributors to follow when contributing to this project. By following these guidelines, we aim to maintain consistency, quality, and efficiency in our collaborative efforts:
### **1. Understand the Project**
Before contributing, make sure you understand the project's goals, objectives, and scope. Familiarize yourself with the existing documentation and codebase. If you have any questions or need clarification, don't hesitate to ask.
### **2. Follow Coding Standards**
Adhere to the established coding standards and style guidelines. Consistent code formatting makes it easier for everyone to read, understand, and maintain the codebase.
### **3. Contribute Meaningfully**
Ensure your contributions add value to the project. Avoid making trivial changes or duplicating existing functionalities. If in doubt, discuss your ideas with the team before implementing them.
### **4. Test Your Work**
Thoroughly test your changes to ensure they work as intended and do not introduce new issues. Write unit tests, integration tests, or end-to-end tests where applicable. Make sure to test both Android and Apple.
### **5. Document Your Changes**
Document your code, including comments, docstrings, and other relevant information. Update the project's documentation to reflect any changes or additions you make. We all hate it, but it's important.
### **6. Follow Commit Message Format**
Follow the [commit message format](#commit-message-format) to ensure that commit messages are clear, descriptive, and informative. Use the appropriate prefixes for different types of commits (e.g., `ADD`, `FIX`, `REF`, `TST`, `OPS`, `DOC`).
### **7. Create Pull Requests (PRs)**
When you're ready to submit your changes, create a pull request with a clear title and description. Include relevant details about the changes, why they were made, and any potential impacts.
### **8. Review and Respond**
Be responsive during the code review process. Address any feedback or comments provided by reviewers promptly. Be open to constructive criticism and willing to make necessary changes.

## Commit Message Format

All commits should have one of the following prefixes:
- `REL`: Release
- `FIX`: Bug Fix
- `ADD`: New Feature
- `REF`: Refactoring
- `TST`: Testing
- `OPS`: Operations
- `DOC`: Documentation

For example, `"ADD: New feature"`.

### Commits should be Atomic:
This means one commit should correspond to one feature, one bug fix, etc. Mixing multiple changes in a single commit makes it harder to track changes and identify issues.

## Releases

When tagging a new release, use the following format:
```bash
git tag -m "REL v<X.X.X>: <commit hash>" v<X.X.X> -s
```
For example, tagging a new release with version `v1.4.0` and a commit hash of `157c9c2` would look like this:
```bash
git tag -m "REL v1.4.0: 157c9c2" v1.4.0 -s
```
You can obtain the commit hash from the git log. Don't forget to push tags using:
```bash
git push origin --tags
```
Alternatively, you can tag a new release using the following format:
```bash
git tag -a v<X.X.X> <commit hash> -m "v<X.X.X>" -s
```
When tagging a new release, ensure you increment the version in `package.json` and other relevant files. We have a script for this purpose: `./scripts/edit-version-number.sh`. In the commit where you update the version, use the following commit message format:
```bash
"REL v<X.X.X>: Summary message"
```

## Opening an Issue

When opening a new issue, provide a clear and concise description of the problem or feature request. Include relevant details, such as steps to reproduce the issue, expected behavior, and any other information that may help others understand the context.

## Guidelines

### **Do *Not* Add New Dependencies**
Avoid adding new dependencies. Bonus points if you manage to remove a dependency.
### **Use TypeScript**
All new files must be written in TypeScript. Bonus points if you convert existing files to TypeScript.
### **Organize Components**
New components should be placed in the `components/` directory. Consider refactoring old components in `BlueComponents.js` into separate files for better organization.
### **Follow Community Guidelines**
Adhere to the project's code of conduct found [here][conduct].

[conduct]: https://github.com/BlueWallet/BlueWallet/blob/master/CODE_OF_CONDUCT.md

