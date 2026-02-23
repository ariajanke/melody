
# WARNING
This is the first iteration of this work, and therefore is not in a demostrable condition.

My best, honest attempt at defining a language.

# What is "Melody"
The pie-in-the-sky aspiration for Melody involve it in becoming a multi-layered, "dynastatically" strongly typed programming language. "Project completion", another lofty goal will look like: the language being able to support its own compliation (i.e. a functioning backend written in itself).

This language has a "set of preferences", which include "hugging the stack", prefering english like syntax, high signal to noise ratio.

In this and its previous incarnation, it was both compilable and interpreted. Its interpretability has the purpose of allowing Melody to support its "layered" nature. Including its meta type functions.

# Goal of this Handbook
Provide a central place to define the language in as much detail and precisely as possible. This is not a specification.

# Influences
- Ruby (the concept of "receiver")
- C (for favoring inline allocation and stack usage)
- Lua (for english heavy syntax)
- JavaScript (for its use of functions as first class citizens, and captures)

# An Introduction a code snippet at a time.

## Declations

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

## Builtin Types
For now only the following two: `Integer`, and `ConstantString`.

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

### [not implemented] Function Let
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
A "Context" Type is the current scope as a sort of implicit "table" of functions. In similar vein as "binding" in Ruby, or "this" in JavaScript. In fact it is the very first true user defined type!

Any function that does not have an explicit receiver, implicitly has the "Context" as its receiver.

### [mostly unimplemented feature] Tables
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

### [unimplemented feature] Function definition (with params)
```melody
let f = fn (a is Integer) a*2
```
At the current stage, functions do not accept nor return anything. An "is" expression maybe followed by

### [complex example] The "Psuedo-Class"
```melody
let Rectangle = fn (a is type Numeric)
  let klass = table
    new = fn (left_ is a, top_ is a, width_ is a, height_ is a)
      table
        # each line is taken as a let
        left := left_
        top := top_
        width := width_
        height := height_
        right fn left + width
        bottom fn top + height
      ~ 
    ~
    # self referential uses of variables will be difficult
    # additionally "FunctionType(...)" will need to support reflection
    type = klass.new.returns
  ~
~
let IntRectangle = Rectangle(Integer)
let r = IntRectangle.new(1, 2, 3, 4)
puts(r.right)
```

### [mostly unimplemented] The Reference
The closest thing this language has to a "pointer". Reference span from "smart" to "raw" pointers. The big difference with them and especially "raw" pointers, is that they are subject to a variety of tight rules that prevent dangling.

In Melody's current incarnation, the only existing reference is the current context accessor function (i.e. ".&gt;context&lt;"). This accessor is not intented for use by the programmer, but rather is intented as a building block for other language features. One such example: making variables accessible to child functions [not yet implemented].

### [planned] Arrays
Since Melody can be compiled down to WASM, we can import C functions (like malloc/free). Much like arrays, low level support for its syntax is needed.

```melody
# C++ for all its faults has solutions for copy/move/usw
let Clib = System.loadclib('libc').forFunctions('malloc', 'free', 'memcpy')
let CppLikeArrayFns = Referential.via(Clib.malloc, Clib.free)
let Array = fn (a is type Object)
  # we can allow for shallow copies, much like JavaScript (for sake of simplicity)
  # space_type contains alignment and size information fo "a"
  # CppLikeArrayFns.newFor returns a reference counted "shared_ptr"
  let buf := CppLikeArrayFns.newFor(10, a.space_type)
  let idx := 0

  let reallocate = fn
    let newSize = idx * 2
    let newBuf = CppLikeArrayFns.newFor(newSize, a.space_type)
    # memcpy is a sort of a primitive "move"
    Something.
  ~

  let klass = table
    new = fn
      table
        push = fn (x is a)
          (idx >= 10).then(reallocate)
          buf.set(idx, x)
          idx := idx + 1
        ~
      ~
    ~
  ~
~

# ":=" means "reassignable", but what about mutability generally? this isn't meant to be "const" like JavaScript, "=" is meant for hard, and deep immutability
let ex := Array(Integer).new()
ex.push(1)
ex.push(2)
# in current Melody, this creates a shallow copy
let ex2 := ex

```

(What advanced features are being assumed here? this is not a garbage collected language. But we can use shared_ptr like functionality)

## [planned] Self-support needs
- arbitrary look ups
- arrays
- references

trait adaptation, take class N and convert it into another object such that mappings for function calls matches the actual function's implementation. though with reflective capabilities enumerating functions and constructing a new type that functions as the adapter

to take it back to earth, just having the tokenizer written this language would be a major feat

# Definitions

## [planned] Interface
An inspecific "Type" which represents a contract.

Two directions of support... one for traits the other for generics.

### [planned] Trait like
```melody
let anyAdder = fn (a is any Numeric, b is any Numeric) a + b
# thus enabling:
anyAdder(1, 2)
anyAdder(1.5, 2.5)
```

### [planned] Generic like
```melody
let Point = fn (a is type Numeric)
  fn (x is a, y is a) (x, y)

# thus enabling:
const pt = Point(Integer)(1, 2)
```

#### The difficulty here
In the trait like example, "a" is substituted with a value of a specific type. In the generic like example, "a" is substituted for the actual type of the argument. The issue here is two seperate treatments from the same syntax.

## Representation
Any kind of reference/pointer to a instance of a Type.

## Type (Object)
Well defined, has an exact size in bytes. It has specific set of methods
