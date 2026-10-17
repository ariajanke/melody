# Initial Task Spawner
In order for the compiler to start, it needs an initial set of tasks. These tasks are fired off via an initial tree traversal. Early in the process, a lot of name mapping services are needed to set things up first. There are used ancestor frames, base context types, and finally the initial task set.

Once a task list is ready, the task controller is instantiated with them, where it takes full ownership of those tasks.

## Recall

The definition of a context type: the object type that describes the reference to the current stack frame. This is how we define all our "variables" (attribute accessors and modifiers) and functions.

## What It Does

The initial tasks are as follows and they are spawned when certain node types are hit.
- per initializer (let, parameter expression): context shift task
- per definition: context type completion task

A context shift task creates a context shift, which describes how to mutate the current context object type. A context type changes/evolves as more lets are introduced, until finally the definition body closes. When that body close gets hit by the traversal, a "type completion" task is run.

A context shift task may (and will often) additionally create a code emission sub task, which gets scheduled after the type completion task. This scheduling schema is in place because we don't know what variable lives where until the context type finishes at the end of the body. We won't need that code emission sub-task if that let describes an immutable immediate value.

A context type completion task will create a function registration task, which has lower precedence than the aforementioned code emissions. This ensure that function registration happens only when we know everything we need to know to emit all of the necessary byte code that defines the functions runtime behavior.

## Future Expansion
An essential goal of Melody is its ability to use compiled code to aid itself. Which allows it to implement some very powerful features from reflections, to generics, to metaprogramming. Tasks are a solution to the async JavaScript/sync-only WebAssembly problem.

## References
[names](../what-is-a-name.md)
