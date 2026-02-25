---
description: "Melody Copilot Instructions"
applyTo: "**/*.ts,**/*.md"
---

# Generally

## Definitions
- "Melody infrastructure proper" = the core of Melody, including all of the code that (excludes web support, tests, and frontend)
- "Rules" are "must/must not"
- "Guidelines" are generally "should/should not"
- `./ideas.md` contains brainstorming
- `./language_handbook.md` contains more concrete language design decisions and examples
  - therein everything denoted with "[]" means something that is still in flux

## General Rules

- Copilot MUST NOT APPLY CHANGES `./ideas.md` OR `./language_handbook.md` AT ALL
- Copilot MUST NOT USE FIRST PERSON PRONOUNS, BE IT PROMPTS/COMMENTS/CODE (even if I by accident use second person pronouns to refer to the copilot system.)
- do not pull from copyleft codebases if possible (except this one)

## General Guidelines
- avoid negating language (e.g. prefer "unique" over "de-duplicated")

## Import Rules
- Do not import further down the directory hierarchy, unless that directory is the same name as the file being worked.
  - EXCEPTION: Tests are much more lax, though prefer to limit imports
- tests may import from as mirrored by the `src` directory
- tests must not import from other tests
- feel free to add test helpers as needed, to keep things DRY
## Import Guidelines
- Try not to import too many files per file
  - 20 is far too many
## Code Structure Rules
- Keep files under 200 lines if possible
- Do not use raw JavaScript classes
- with abstractions, use `MyAbstraction` with a `make` function
- absolutely no `async` functionality within Melody infrastructure proper
  - relegate such functionality to either `./src/web_support` or tests only
- constants must follow this pattern: `kMyConstant`
- single source of truth everything as much as possible
- absolutely NO magic numbers or strings, if needed (e.g. for WASM) use named constants that briefly describe what they are or mean
- Ruby-style naming convention for Abstractions and their files (e.g. `MyAbstraction` in `my_abstraction.ts`)
- abstraction objects must be frozen with `Helpers.freeze` (or `freeze` imported from `Helpers`)
  - this includes both what is returned from make and the exported object itself
- do not use `this`, name the object if you must
- `inst` refers to the object being returned from `make` functions, and should be used as such
- arrays/dicts being returned or passed, are readonly unless there's a compelling reason for them to be mutable
  - e.g. injecting an array as a sort of "spy" in testing
- use `Readonly<>` over `readonly`
- do not do any work in a `make` function, it is only for construction
- a `make` function's parameters may contain already completed work (i.e. values which themselves are products of previous abstractions/services)
- have member functions defer the work of the abstraction until it is called
- strictly follow the linting rules
- throw exception only on code paths to signal "this is broken"
- `StandardError` from `Helpers` for much of the `error` functionality
- make use of `??` and `?.` for possibly undefined values
- make use of `!` for values that are definitely defined, such as subsequent calls on memoized functions
- lines must be fewer than 120 characters
- have the `make` function be the only thing that creates an instance of `MyAbstraction`
- no "new" keyword, use either existing helpers/abstractions/utilities or basic JavaScript objects or build your own in the same style as the rest of the codebase
# Code Structure Guidelines
- prefer one abstraction per file
- abstractions ideally contain two functions: `outputThing` and `error`/`errors`
- make use of `memoize` as appropriate
- builders are okay, if they greatly simplify the problem
- everything part of Melody infrastructure proper should ideally be "implementable" in Melody itself (at its most mature/idealized incarnation)
- Keep files somewhere between 35-120 lines, 50-80 is the sweet spot
- abstractions should be at least two names `MyAbstraction` never just `Abstraction`
- treat `MyAbstraction` like a class, any other functions defined in it is considered a sort of "static" function
- member variables should be prefixed with `m` (e.g. `mMyMemberVariable`)
- the object being returned from `make` should be called `inst`
- it may not be possible to avoid many javascript "tricks", this is not much a concern
  - e.g. spread operator in `{ ...myStuff, someOtherThing }`
- keep a blank line at the end of each file
- make frequent use of `const { a, b } = thing`
- try to keep lines under 80 columns
- break long chains of `const { a, b } = thing` into something like:
  ```
  const {
    a,
    b,
    c,
    d
  } = thing
  ```
- export interface `MyAbstraction` on top, export `const MyAbstraction` on the bottom
- take a look at (at time of writing) `src/function_type_build/initial_set_implementation.ts`, this is an example of what *not* to do with regard to `outputThing` and `error` pattern
- take a look at (at time of writing) `src/function_type_build/initial_set_build.ts`, this is the preferred way of handling `outputThing` and `error` patterns
- if an if expression can fit into one line, don't and instead do this:
```ts
  if (condition)
    { doThing(); }
```