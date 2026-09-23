# WARNING
This is the first iteration of this work, and therefore is not in a demostrable condition.

My best, honest attempt at defining a language.

# What is "Melody"?
The pie-in-the-sky aspiration for Melody involve it in becoming a multi-layered, "dynastatically" strongly typed programming language. "Project completion", another lofty goal will look like: the language being able to support its own compliation (i.e. a functioning backend written in itself).

This language has a "set of preferences", which include "hugging the stack", prefering english like syntax, high signal to noise ratio.

# Goal of this Handbook
Provide a central place to define the language in as much detail and precisely as possible. This is not a specification.

# Influences
- Ruby (the concept of "receiver")
- C (for favoring inline allocation and stack usage)
- Lua (for english heavy syntax)
- JavaScript (for its use of functions as first class citizens, and captures)

# An Introduction a code snippet at a time.

## Declations
Declarations are made using a sort of "standard let". The follow the formula: `let <name expression> <declaration group> <initial value>`.

### Standard constant declaration
```melody
let a = 5
```

### Standard "mutable" declaration
```melody
let a := 5
```

### Variable Reassignment
```melody
let a := 5

a := 10
```
A mutable maybe reassigned to any value of the same type. Remember: Melody is a compilable language.

#### A note on the l-value/r-value problem
This language solves this problem via a slightly different way. While in for example C, lhs of an assignment is treated differently. In Melody, the name is "stripped" along with the assignment operator itself and converted into a specific method name to be sent to the penultimate receiver.

In the above example, "a :=" is converted into "a:=" which is then sent to the current Context.

### Name Expressions
Everything left of an initializer type root operator is considered part of a name expression.

As of 2026-0917, only singular and comma delimited sets of identifiers are considered to be valid name expressions.

PLANNED
A name expression takes the following form:
`<name> , ...`

#### The "is" Operator [planned]
&lt; left blank for now &gt;

### Tables [planned]
Tables are a list of name expressions, which create a composite type.

## Builtin Types
For now only the following: `Integer`, `ConstantString`, `SystemIO`, and every possible tuple (i.e. `Tuple(...)`).

### Integer
Represents the humble integer of course. In WASM it's represented with an `i32`, however Integer is not 32 bits by definition. Its byte width isn't fixed by definition. The following functions are defined:
- `+`
- `-`
- `*`
- `:=`

#### [planned] functions
- `<`
- `>`
- `=`

### ConstantString
Represents a string literal. It is immutable and interned (via a "StringPool"). It has no defined functions aside from assignment. It is also represented with an `i32` in WASM.

### [planned] Boolean
Represents a boolean value. It has the following functions:
- `and` (binary operator)
- `or` (binary operator)
- `not` (unary operator)
- `then`
  - proper member function
  - taking either a value or function returning some type

Example
```melody
# returns BooleanContinueOf(Tuple())
# NOTE you need that "else" call! Otherwise no "Hello World!" for you!
(1 = 1).then(fn puts('Hello World!')).else()
```

### [planned] BooleanContinueOf(Type)
Represents a boolean value that follows a "then" call. This is meant to be used in the context of if/else statements.
Its functions are:
- `else`
  - as a proper member function
  - taking either a value or function returning the same type as "then" had
  - returns the actual value of the chain (i.e. "Type")
- `else_if`
  - first two points of "else"
  - similarly returns a "BooleanContinueOf(Type)" for chaining

### Tuple declaration
```melody
let t = (1, 2)
```
Tuples are mixed type composites. Their type name follows this pattern: "Tuple(t1, t1, ..., tn)".

```melody
let t := (1, 'Hello')

t := (2, 'World')
```
A mutable tuple maybe assigned only all at once, not individually. They are restricted to their original type like every other variable.

#### Tuple member access
Individual members maybe accessed by "exploding" them.
```melody
let t = (1, 2)
let (a, b) = t
```

### [planned] More on Tuples
Further conviences may be afforded in future developments. It will remain rigid for now.

### Basic Function Definition
```melody
let f = fn
  puts('Hello, World!')
~ # <- note that this closes the function body

f()
f # is a reference
```

For now, a function accepts no parameters and returns nothing.

A function defintion as an expression that itself evaluates to special reference type (i.e. an index).

Since we want first class style functions, we need to given them properly defined object types. Tersely we could namify like: "FunctionType(Param1, Param2, ...)(Return1, Return2, ...)". Recall that type names do not necessarily uniquely identify a type, its just there for readability.

#### [planned] alternate syntax
So far the language doesn't support more terse syntax like:
```melody
let f = fn puts('Hello, World!')

callTwice(fn
  puts('Hello, World!')) # <- body close by that second parenthesis
```
(Mind my disappointment)

### [planned] Function Let
```melody
let a = 5
let b := 1
let c fn a + b

puts(c) # 6
b := 2
puts(c) # 7
```
Shortcut for defining an accessor like function. A restriction is that the function must not take any parameters.

### The "Context" Type
A "Context" Type is the current scope as a sort of implicit "table" of functions. It is the stack frame for the function currently being run. It is the very first true user defined type!

Any function that does not have an explicit receiver, implicitly has the current "Context" as its receiver.

#### Variables accross Stack Frames
In context has another special function `&gt;parent&lt;`. This returns a reference to the parent context.

The `&gt;parent&lt;` function allows contexts to access variables defined outside of them.

Consider:
```melody
let a = 5
let f = fn puts(a)

f()
```

This becomes:
```melody
let a = 5
let f = fn (<parent> is <RootContext>)
  let a = <parent>.a
  puts(a)
~
f()
```
The above illustrates that the parent is essentially a hidden parameter (the receiver to be precise).

##### Sibling Function Case

Consider:
```melody
let a = 5
let f = fn puts(a)
let g = fn f()
```

This becomes:
```melody
let a = 5
let f = fn (<parent> is <RootContext>)
  let a = <parent>.a
  puts(a)
~
let g = fn (<parent> is <RootContext>)
  let f = <parent>.f
  f()
~
```
This follows the exact same logic for variable access. The only difference is how `f`'s function index is reached. Instead of simple value retrieval, we need to go through the parent (like a table) to get it.

### [partial] Tables
Much like its predecessor C, a "table" is a sort of inline declared struct. Each member key is converted into an index (much like C), whose values maybe accessed by sending a message (like Ruby) to the table.

Believe it or not, you've already seen a version of this with the "Context". Instead of let declarations, you have name and value pairs.

```melody
# "t" is a special Type which has method ".a" which returns 1
let t = table
  a = 1
  b = 2
~

puts(t.a)
```

Tables are exactly like tuples, except they also have explicit names. They are not mutable by default (":=" needs to be used for that specific member). Should be easier to implement when "Context" types are working.

#### Table Member Access
Table members are accessed with the dot `.` operator, which must be proceded by a valid identifier (name).

The function that's called on a table depends on how access is expressed.
For example `t.a` will call `.a` on `t`, but `t.a()` will call `a` on `t`.

##### Implementation Note 2026-0914
As of now, `SystemIO` is a builtin table which maybe accessed by a programmer. Its current incarnation is planned to be entirely replaced, even `puts`.

### [planned] Function Definition with Parameters
```melody
let f = fn (a is Integer) a*2
```

#### Required Support
Melody will need a basic layered intepretation/compilation. "Integer" here while a type, is also a name for an accessor function. Here `is` when used in this fashion expects that the accessor `.Integer` is immediately evulable. Without that, Melody has no way of knowing how big everything needs to be.

However, once in place you'd be able to do something like:
```melody
let MyType = table
  new = fn (x is Integer, y is Integer)
    table
      x := x
      y := y
    ~
  ~
  type = MyType.new.returns
~

let printMyType = fn (instance is MyType) puts(instance.x, instance.y)

let mt = MyType.new(1, 2)
printMyType(mt)
```
Here `is` will look up `MyType.type`. How do we know this is immediately evulable? Implicit type-meta functions (explained later) leading from that call all the way to that transformed returned table, from `new`'s type-meta function's return.

### [planned] Function Definition with Returns
What gets returned by a function is determined the same way as in Ruby. Since there are no guard clauses in this simple language, that means the last expression only.

```melody
let f = fn
  1
  2 # <- this is the return value
~

puts(f()) # 2
```

Most languages will return exactly the type of that expression. Melody is a bit different. When a table or function is returned, if there are any "lets" that get escaped, that return gets transformed.

Consider:
```melody
let f = fn
  let a = 1
  let g = fn a

  g
~

let h = f()
```

In the above example, `a` gets "escaped" due to `g` capturing it and being returned from `f`. As a consequence, Melody is forced to transform `g` into a closure. Its size grows (specifically a function index + integer).

### [partial] The Reference
The closest thing this language has to a "pointer". Reference span from "smart" to "raw" pointers. The big difference with them and especially "raw" pointers, is that they are subject to a variety of tight rules that prevent dangling.

In Melody's current incarnation, the only existing reference is the current context accessor function (i.e. ".&gt;context&lt;"). This accessor is not intented for use by the programmer, but rather is intented as a building block for other language features. One such example: making variables accessible to child functions.

## [planned] Self-Support Needs
If we're going to have the ideal goal of Melody supporting itself, we'll need sophisticated language features.

Including:
- arbitrary look up tables
- arrays
- heap references
- the "adaptive" reference

# Definitions

## [planned] Interface
An inspecific "Type" which represents a contract.

Two directions of support... one for traits the other for generics.

## Representation
Any kind of reference/pointer/value to a instance of a Type.

## Type (Object)
Well defined, has an exact size in bytes. It has specific set of methods

# Copyright Notice
Melody WASM Compiler

Copyright (C) 2026 Aria Janke

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
