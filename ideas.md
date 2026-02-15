
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