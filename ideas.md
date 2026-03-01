
new idea for "hello world!"
have a single global table
```melody
SystemIO.onLine(fn
  SystemIO.puts('Hello World!')
  return 'done'
)
```

ofc that describes interactivity potential

this being the simpliest:
`SystemIO.entry(fn SystemIO.puts('Hello World!'))`

Also for more interactive graphics programs (would involve a much more evolved version of the language).

```melody
let Apple = load('apple')
let fruit = Apple.new

SystemIO.onLoad(Apple.loadAssets)

SystemIO.onFrame(fn (canvas is Canvas2D)
  fruit.drawOn(canvas)
)

SystemIO.onKeyRelease(fn (code is String)
  code.ifIs('e', fruit.advanceFrame)
  # alternatively...
  ('e' = code).then(fruit.advanceFrame)
  # keeping both lines would result in advance the frame twice
)
```

The generic rectangle example, which reflects a key goal of the language.
```melody
let Rectangle = fn (NumType is Numeric)
  return table
    new = fn (w is NumType, h is NumType)
      return table
        width = w,
        height = h
      ~
    ~
  ~
~
```

Basic program with fn blocks.

```melody
let a = 1
let b := a + 3
let c = a + b
let f = fn
  puts('Hello from fn!')
  puts(c)
~

f()
puts(c)
b := 10
puts(b)
```

Function objects
Like everything in this language it follows a "hug" the stack paradigm. Which on that note, interesting problems present themselves.
```melody
let a := 5
let f = fn puts('Hello from fn!', a) # ref excp d

puts(a) # ref excp a

f() # ref excp b
functionQueue.add(f) # ref excp c
```

Function Type of "f"
- contains a reference to the parent context
- "a" is access via the parent context in a "C++ this pointer" manner

excp a
This call is performed as follows:
- mount the current context
- mount the parameters
- call f
"f" maybe implemented to consume that context reference, it only needs to be mounted.

The fibonacci bar
```melody
let fib = fn (n is Integer) (n < 2).
  then(n). # BooleanType as taking any parameter (as a builtin type perhaps?) and generating appropriately
  else(fn fib(n - 1) + fib(n - 2))

puts(fib(10))

Either. # cases... for a generalized either
  new().
  # end up constructing type on a per case basis
  on(n < 2).do(fn n).
  # with other cases wie: on(<condition>).do(fn <body>)
  # 
  # on otherwise (convert to actual value?)
  otherwise(fn fib(n - 1) + fib(n - 2))

```

Needs captures, explicit parameters, implicit return (Ruby style), and boolean type (and its functions) to complete.

Captures and Function stow away problem.

There is a problem with functions having captures, whose frames lifetimes ends when the function is called later.

Consider:
```melody

let make_counter = fn
  let count := 0
  fn count := count + 1
~

let counter = make_counter()
# Ahh! What happens to "count"??
# that stack frame is long gone
counter()
# Imitating Neil DeGrass Tyson *Well actually...*
# Let's take a look at that second line again
# You'll notice that "a" goes out of scope because that's a return expression
# If our compiler is smart enough, it can do an "implied type transformation" specifically with that function. It now carries a "shadow". (So data wise, it's not just the function index, but also a place for "a" to live.) This highlights the "stack hugging" nature of the language.
# let's see how that concept works with the example below 
counter()
```

Another case
```melody

let base := 5
let make_counter = fn
  let count := 0
  # What about now huh?
  # okay, I'm a consistent compiler, so, we'll have "count" lie in the transformed function's "shadow"
  # and "base" will also get transformed much like "count"
  # but there's an important difference here
  # "base" will *still* be alive following the return
  # so we simply change how deferecing it works. Instead of the grandparent, go to the parent (whatever the receiver ends up being for this returned function)
  return fn (count := count + 1) + base
~

let counter = make_counter()
counter() # 6
a := 10
counter() # 12

```

Memory layout of this scope object
ADDR (in words) | VAR
----------------|----
0               | &lt;context&gt;.base
1               | &lt;context&gt;.make_counter
2               | &lt;context&gt;.counter (index)
4               | &lt;counter&gt;.counter (count)

#### NOTES TO SELF

Each function would need to carry its own captures (a keen observer has noticed the absence of "receiver" this name). Generalized function calls involving a receiver mount (along with the usual arguments) may be able to bridge this gap. If a receiver is not needed, the function will just "eat" it.

We're going to solve tables and captures in one go, and it's really exciting. The "Context" is already a table, we're mounting that as the receiver of a child function call. We now have access to the parent's table.
In x86 parlance, the context that gets passed is the "previous stack frame pointer", like the "sp" register.

We try to accomplish a lot with as few primitives as possible. The underlying pattern of how tuples and tables are derived from the same idea of sequential layouts.

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

  # we end up needing a separate name for parent
  puts(a)
~

f()
```
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

```
let a = 10
let f1 = fn
  added <parent> = <root>
  implied a = <parent>.a
  puts(a)
~
let f2 = fn
  added <parent> = <root>
  let f3 = fn
    # says I need "f1", and therefore "<root>"
    added <parent> = <f2>
    implied <root> = <parent>.<root>
    # <parent>.<root>
    # okay
    # <parent> = grab SP from param 0
    # 
    implied f1 = <root>.f1
    f1() # <- this essentially/has to become "<root>.f1()"
  ~
  f3()
~
f2()
```

Parent and current contexts are not necessarily sequential (i.e. not necesarily by the difference in the size of the current context, that is there maybe a gap, e.g. the sibling call case).

TODOS
- [ ] initial set for parent context on context builder
- [ ] a complete ftype which sets up that parent context
  - this will also update 

### Melody "Heaven"
Essentially "idealized" Melody, representing the "greatest" vision of what the language could be. Imagining Melody implementing itself.
```melody
# consider a `src/dast_build/dast_let_build.mldy`
let Helpers = load('helpers')
let StandardError = load('standard_error')
let IastNode = load('iast_node')
let table
  DastBuild,
  WritableDastDeclarationMap
~ = load('dast_build')
let DastDeclarationMap = load('dast_declaration_map')

let table freeze, memoize ~ = Helpers

# IastNode, and Fn are "adaptive interfaces"
let new = fn (
  mInnerNode is IastNode,
  mIntoDastBuild is Fn(IastNode)(DastBuild),
  mCurrentDeclarations is Fn()(WritableDastDeclarationMap))

  # Either((LetElements, DastNode), StandardError)
  let mRetrieval = LetDeclarationRetrieval.new(mInnerNode, mIntoDastBuild)
  let table error, setErrorFn, setErrorMessage ~ = StandardError.new()
  let table elements, dastNode ~ = mRetrieval

  # I want "here are things I do on left", but also
  mRetrieval.chain_left(fn (elements, node)
    elements.map(fn (element)
      DastLetDeclarationBuild.new(element)
    )
  )
  # expected isn't a bad way to go either...

  # heck this function returns an either too!
~

# similar to Lua returning a table at the end of a file
return table new ~
```