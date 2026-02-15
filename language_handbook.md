
# WARNING
This is the first iteration of this work, and therefore is not in a demostrable condition.

My best, honest attempt at defining a language.

# What is "Melody"
The pie-in-the-sky aspiration for Melody involve it in becoming a multi-layered, "dynastatically" strongly typed programming language. "Project completion", another lofty goal will look like: the language being able to support its own compliation (i.e. a functioning backend written in itself).

This language has a "set of preferences", which include "hugging the stack", prefering english like syntax, high signal to noise ratio.

In this and its previous incarnation, it was both compilable and interpreted. Its interpretability has the purpose of allowing Melody to support its "layered" nature. Including its meta type functions.

# Goal of this Handbook

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

### More on Tuples
Further conviences maybe afforded in future developments. It will remain rigid for now.

### Basic Function Definition
```melody
let f = fn
  puts('Hello, World!')
~ # <- note that this closes the function body

let f2 = fn 5 # this one-liner, the if AST builder sees an expression after the "fn" it is treated as the body.
# A function may also be closed by a ")", the AST builder is smart enough to know that if there's a dangling "(" from before
callTwice(fn 'Hello, World!')

f()
f # is a reference
```

For now, a function accepts no parameters and returns nothing.

A function defintion as an expression that itself evaluates to special reference type (i.e. an index).

Since we want first class style functions, we need to given them properly defined object types. Tersely we could namify like: "FunctionType(Param1, Param2, ...)(Return1, Return2, ...)". Recall that type names do not necessarily uniquely identify a type, its just there for readability.

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

#### NOTES TO SELF

Each function would need to carry its own captures (a keen observer has noticed the absence of "receiver" this name). Generalized function calls involving a receiver mount (along with the usual arguments) may be able to bridge this gap. If a receiver is not needed, the function will just "eat" it.

We're going to solve tables and captures in one go, and it's really exciting. The "Context" is already a table, we're mounting that as the receiver of a child function call. We now have access to the parent's table.
In x86 parlance, the context that gets passed is the "previous stack frame pointer", like the "sp" register.

We try to accomplish a lot with as few primitives as possible. The underlining pattern of how tuples and tables are derived from the same idea of sequential layouts.

```melody
let a = 10
let f = fn
  # so, what's going here?
  # "a" is defined for *this* function's context, It is a thin wrapper around the parent's version of this function.
  # the parent version is "load from index n"
  # the child version is "load from index n from parent index"
  # the best part is, is that this can be done recursively!
  # "but what if I have another let named 'a' in my child function?"
  # well, that's just scoping my friend, and your version of "a" becomes the only relevant definition and gets captured instead by the grandchild
  # is it performant? No, does it work? In theory only (lol)
  # my context builder is a tad big and could stand some refactoring

  # we end up needing a seperate name for parent
  puts(a)
~

f()
```

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

### [Another Complex Idea] Arrays
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

## Self-support needs
arbitrary look ups
arrays
referentials
trait adaptation, take class N and convert it into another object such that mappings for function calls matches the actual function's implementation. though with reflective capabilities enumerating functions and constructing a new type that functions as the adapter

to take it back to earth, just having the tokenizer written this language would be a major feat
# Definitions

## Interface
An inspecific "Type" which represents a contract.

Two directions of support... one for traits the other for generics.

### Trait like
```melody
let anyAdder = fn (a is any Numeric, b is any Numeric) a + b
# thus enabling:
anyAdder(1, 2)
anyAdder(1.5, 2.5)
```

### Generic like
```melody
let Point = fn (a is type Numeric)
  fn (x is a, y is a) (x, y)

# thus enabling:
const pt = Point(Integer)(1, 2)
```

### The difficulty here
In the trait like example, "a" is substituted with a value of a specific type. In the generic like example, "a" is substituted for the actual type of the argument. The issue here is two seperate treatments from the same syntax.

## Representation
Any kind of reference/pointer to a instance of a Type.

## Type (Object)
Well defined, has an exact size in bytes. It has specific set of methods

## "Context" Type
