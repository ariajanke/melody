
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
  # necessitated by "f3" needing "f1"
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

Mutual dependance
```
let f1 = fn (a is Integer)
  f2(2 * a)
~
let f2 = fn (a is Integer)
  (a < 10).
    then(a).
    else(fn f1(3 - a))
~
puts(f1(5)) # prints -14, completely valid
```

Add implied and parents
```
let f1 = fn (a is Integer)
  let f2 = <parent>.f2
  # only block if "f2"'s type cannot be finished
  f2(2 * a)
~
let f2 = fn (a is Integer)
  let f1 = <parent>.f1
  (a < 10).
    then(a).
    else(fn # call me "f3"
      let f1 = <parent>.f1 # essentially <parent>.<parent>.f1
      f1(3 - a)
    )
~
```

Now consider that we drill down DFS style, with declarations being processed first.
We start in `f3`. We have `f1` as a pending name. So generate an initial set and accessor for `<parent>`. The context for `f3` is not finished.

We (somehow) have to go up to `f2`, and then just "add" a new pending name for `f1`. (Repeat until root?) We're still not done with `f3` yet. Note that `f1` might not be defined in `root` just yet! At a glance we already know what the definition for `f1` and `f2` are, but how?

What do these functions look like in type-meta land?
```
let f1 = fn (a is type Numeric)
  f2(2 * a) # (a = Integer).then(Integer)...
~
let f2 = fn (a is type Numeric)
```

For present day Melody:
```
# pendingNames: []
let f1 = fn
  # pendingNames: ['f2']
  # go up to root
  # "yup, '.f2' definitely exists"
  # can't visit it (otherwise, boom goes the stack)
  # can we "partially" visit it such that we can figure out
  # the return/result type is?
  f2()
~
let f2 = fn
  # pendingNames: ['f1', '.f1']
  # there's also the way in which things are called
  # We drilled into f2, attempting a build, what exactly are we trying to do?
  # Get the actual ftype for instruction emission, so we can call it. We don't have to know how to emit f1.
  # How do I sneak the concept of "process-time constant" in here?
  
  f1()
~
```
Should be valid (albiet useless and infinitely recursive).
Breaks down into the difference between an Object type and a Function type.
```
# ".a", ".f", "f"
let f = fn puts(a)
let a = 5
f()
```
We definitely need a "partial" build.
Can I "partially" build "f" first, (that is move from a DFS to BFS style of processing?)
That way the parent context is finished first.
Now, what are the implications with layered processing goals, and type-meta functions?
```
let mytm_f = fn (n is type Numeric)
  fn (a is n) a + 2
~
let mytm_g = fn (n is type Numeric)
  n.new(5)
~
let my8 = mytm_f(Integer)(6)
let my5 = mytm_g(Integer)
```
For layer 1 evaluate:
- `mytm_f(Integer)`
- `mytm_g(Integer)`
Becomes layer 0 (never mind that all are PTC candidates)
```
let my8 = (fn (a is Integer) a + 2)(6)
let my5 = Integer.new(5)
```


```
let a = 10
let f1 = fn
  let f2 = fn
    # <parent> = <f1>
    # pending: ".a" with args "Tuple()"
    puts(a)
  ~
  f2()
~
let f3 = fn
  # <parent> = <root>
  # pending: "f1"
  f1()
~
f3()

```