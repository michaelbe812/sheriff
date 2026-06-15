# Sheriff

![build status](https://github.com/michaelbe812/sheriff/actions/workflows/build.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/%40lambda-solutions%2Fsheriff-core.svg)](https://www.npmjs.com/package/%40lambda-solutions%2Fsheriff-core)

> This is a fork of [softarc-consulting/sheriff](https://github.com/softarc-consulting/sheriff),
> published under the `@lambda-solutions` npm scope. All credit for the original work goes to the
> [Softarc Consulting](https://github.com/softarc-consulting) team.

Sheriff is a tool designed to enforce module boundaries and dependency rules in TypeScript projects, ensuring a clean and maintainable codebase.

It operates with zero dependencies, requiring only TypeScript as a peer dependency.

Sheriff can be integrated with ESLint for enhanced developer experience or used standalone through its CLI.

Key features include:
- Enforcing module boundaries by defining public APIs through `index.ts` files.
- Dependency rules to control access between different parts of your application.
- Support for automatic and manual tagging of modules to apply dependency rules effectively.
- A CLI for initializing configurations, verifying rules, listing modules, and exporting dependency graphs.

For a more detailed guide on installation, setup, and usage, head to the **[Documentation](https://michaelbe812.github.io/sheriff/)**.

To install Sheriff with the ESLint plugin, run

```shell
npm i -D @lambda-solutions/sheriff-core @lambda-solutions/eslint-plugin-sheriff
npx sheriff init
```

<p align="center">
<img src="https://raw.githubusercontent.com/softarc-consulting/sheriff/main/logo.png" width="320" style="text-align: center">
</p>
