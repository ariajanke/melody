keyword args
table/closure based objects
statically typed
compiles to C?
inspired by: Lua, TypeScript, and Ruby

Primitive/Starter types:
- Array(s)
- Table(s)
- String(s)
- Integer(s)
- Float(s)
- Boolean(s)
```melody

# Ruby's '()' omissions are neat
fn new { # call it whatever you'd like!
  let a = 10
  let b := 1

  # a = 3 # syntax error, is constant
  # a = 'bees' # syntax error, is an Integer

  # return value of foo is type duducable
  fn foo => a + (b += 1)
  fn bar(c: Integer, @d: Integer = 11) {
    return a + b - c + d
  }

  return {
    foo,
    bar
  }
}

# class as describing is-a rather than is-like?
export class Closure_1 = return_type_of(new)
export let Closure_1 = {
  new
}

```

```c

#define SOME_CONTEXT_1_A 10

typedef struct {
  int b;
} Closure_1;

int some_context_1_foo(Closure_1 * c_) {
  c_.b += 1;
  return c_.b + SOME_CONTEXT_1_A;
}

void some_context_1_bar(Closure_1 * c_) {}

// not sure what to generate for new

```

## A more complex example, this time implementing a Vector2 class

```melody

fn new(x := 0., y := 0.) {
  # operator overloading, in melody here '=' means equals, not assignment
  # arguments end up needing explicit types, as their types cannot be deduced
  fn '=' (r: Vector2) => r.x = inst.x and r.y = inst.y
  fn ':='(r: Vector2) => inst.x := r.x and inst.y := r.y and inst
  fn '+' (r: Vector2) => new(inst.x + r.x, inst.y + r.y)
  fn '-' (r: Vector2) => new(inst.x - r.x, inst.y - r.y)
  fn magnitude => Math.sqrt(inst.x*inst.x + inst.y*inst.y)

  let inst = {
    := x, # in table context, the ":=" means mutable
    := y,
    ['='], # constant table parts maybe "optimized away", or rather omitted from the returned = structure,
    [':='],
    ['+'],
    ['-'],
    magnitude = magnitude
  }

  return inst
}

# ofc you would need typing

if (new(3, 0) + new(0, 4)).magnitude() = 5 {
  puts('hello')
}

```

## Modules are "reverse" tree order
That is you may look up, but may not look down. Or you can just use a library.

## Lifetimes/Ownership/Etc

Where does the data live? Everything's a struct until generics are a thing?

## Presence vs Boolean

```melody
# not allowed!
# true and null

# Okay, evaluates to false
true and null.present?

# evaluates to true
false.presence and true
```

## imcomplete language keywords
- and
- or
- if
- fn
- let

## language operators
- +
- -
- =
- :=
- *
- /
- =>

## What could generics and/or macros look like?

```melody
# similar to Rust?
# how can this *not* be ugly?
# how would I make a function with a macro?

<<
  fn foo(a: Type) {
    return fn (b: a, c: a) {
      return b + c
    }
  }
>>

let myfoo = <foo(Integer)>
myfoo(1, 3)

<<

fn RectangleTemplate(scalar: number) {
  return fn new(x: scalar, y: scalar, width: scalar = 10, height: scalar = 10) {
    fn bottom() => x + width
    fn right() => y + height
    fn print_stuff() => {
      if scalar == Integer {
        puts('I am an Integer')
      } else if scalar == Float {
        puts('I am a Float')
      }
    }
    return {
      := x,
      := y,
      := width,
      := height,
      bottom,
      right
    }
  }
}

>>

let RectangleI = <RectangleTemplate(Integer)>
let RectangleR = <RectangleTemplate(Float)>
type RectangleI = <RectangleTemplate(Integer).new.returnType>
type RectangleR = <RectangleTemplate(Float).new.returnType>

# You *could* also do it in runtime as well, you just can't use it as a type
# RectangleTemplate(Integer) # error, cannot use runtime variable as a type
RectangleI.new.return_type # <- totes okay
puts(RectangleI.new.return_type.as_string)

RectangleI.new.print_stuff() # <- when do I evaluate "scalar == Integer"?

```

## Another Revision of syntax
I think I can have parenless cake too!

```melody

# not sure about read-write distinction with parameters though
let Rectangle = fn () { # 'fn's are never auto-called
  let new = fn (left: Real, top: Real, width: Real, height: Real) {
    let bottom = fn() inst.left + inst.width
    let 'bottom:=' = fn(new_bottom: Real) {
      # inst is declared later, but referenced here
      # that's okay, hoisting is a thing in this language
      # however, inst may not be read in anyway until it's defined
      #
      # implementation note: function nodes will need a "requiredCaptures"
      # feature. A check to occur before permitting a call
      return (inst.height = inst.top - new_bottom) and new_bottom
    }
    let right = fn() inst.top + inst.height
    let 'right:=' = fn(new_right: Real) {
      return (inst.width = inst.left - new_right) and new_right
    }
    let move = fn(dx: Real, dy: Real) {
      inst.left = inst.left + dx 
      inst.top = inst.top + dy
    }
    let ['or']

    # ['bottom='](10) # Error! call not permitted until 'inst' is defined
    let inst = {
      := left, # writable, PoD field
      := top,
      := width,
      := height,
      = right, # read-only function
      = ['right='], # read-only setter function
      bottom, # short hand
      ['bottom='], # also short hand
      move,
      ['or'] # or is a keyword, so this becomes an operator definition
    }

    # uh-oh, how am I going to have arrays then?
    # $'bottom:='(10) # you can totally do this

    return isnt
  }

  return {
    new
  }
} ()

# new is a function property
# functions are called auto matically, just like Ruby uwu
let r = Rectangle.new 0, 0, 10, 10
# but let's say you want a function reference, no problem
let new_rectangle = Rectangle&new
let r2 = new_rectangle 0, 0, 100, 100
# r2.bottom := 200 # Error! cannot write to 'inst.height'
let r3 := new_rectangle 10, 9, 45, 10
r3.bottom := 30 # all good!

let somevar := 'somevar'
$'somevar' := 'something else' # okay! and since it's a string literal, it's a compile time thing
let bees := 'bees'
# $bees := somevar # Error! 
bees := 'r2'
$bees.right # I am a rectangle (r2) now
# ^ while okay, there's something tricky the compiler will have to do
# | it will need to construct a RT access table for visable variables in scope


# $somevar := 'string' # Error! no such variable 'something else' exist in <current context>

```

## What if Melody had a more English like syntax?

```melody

let rangeCheck = fn (n: Integer)
  let divisibleBy10 = fn n % 10 != 0
  if n < 0 then
    return 'negative'
  elseif n >= 0 and n < 10 then
    return 'single digit positive'
  else
    if n == 100 or n === 1000 or n == 10000 then
      return 'some 10^n'
    elseif divisibleBy10() then
      return 'something else'
    else
      return 'I can\'t handle that!'
    end
  end
end # <- though I do think of ends as being a little ugly

```

Though something to consider, that there is already quite a lot in the way of
more symbolic notation.

Maybe subsequently, if I can't have ruby call like syntax:

```melody

let new = fn (left: Real, top: Real, width: Real, height: Real)
  let 'right:=' = fn (new_right: Real) \
    (inst.width = new_right - inst.left) and new_right
  let '.right' = fn inst.left + inst.width

  let 'bottom:=' = fn (new_bottom: Real) \
    (inst.height = new_bottom - inst.top) and new_bottom
  let '.bottom' = fn inst.left + inst.width

  return let inst = {
    := top,
    := left,
    := width,
    := height,
    'right:=' = $'right:=',
    = '.right',
    '.'
  }
end

let sshhh := 60
let 'x:=' = fn sshhh := 60
# let x = 'stuff' # actually.. okay
# puts(x) # error 'x' has no getter
let '.x' = fn () (sshhh + 10) * 2
# let x = 'stuff' # error 'x' already defined
x := 9 # cannot resolve 'x' to a variable, okay, check for a setter
       # I found a 'x:=' method! I'll call that with rhs

# as a consequence, funky things could happen
let '.foo' := fn 'hello'
puts(foo)
# foo := 'stuff' # error, 'foo' is read-only
$'.foo' := fn 'stuff'
puts(foo) # works, prints 'stuff'

```

How would I do things like enable mocks/flexiblity for testing?

```melody

<<

let makeWithRunExpectations = fn
end

>>

it('dodo', fn (expectToCall: ???)
  defVisit( expectToCall( fn (rightPart: PartialTreeBuild)
    let start = rightPart.range().start
    let end = rightPart.range().end
    expect(start).toEqual(4)
    expect(end).toEqual(4)
  end) )
end)


```

How would you have generic member functions?
Or how to add to a constant table after a return but still during "before time"?
I think I need to figure out function overloading first. Because this will essentially be a thing that let's me define n number of functions for a name.

``` melody

# somewhere there's a getInterger defined
# It returns an Integer32, a type that
# - fits inteface Integer
# - fits inteface Anything
# each identifier has one type, and many interfaces

<<

# identifiers can be unresolvable in value, or Inaccessible in type
# *sometimes* that's not a problem
let convertTo = fn (a: Anything, t: Type)
  # a is presently unresolvable in value, but not unresolvable in type
  let converter = kConversionMethodsTable[typeOf(a)][t]
  # what about:
  # return kConversionMethodsTable[typeOf(a)][t](a)
  # that means I need for "a" RTTI in place:
  # const char * a_type = "Integer32";
  # const char * t_value = "String";
  # const void * t_0 = mel_table_lookup(kConversionMethodsTable_ptr, a_type);
  # const void * t_1 = mel_table_lookup(t_0, t_value);
  # // void pointer representing a Melody string instance
  # // at this point we know that "a" is an "int32"
  # // that the looked up method is void*(*)(int32) c function
  # const void * t_return_value = ((void *(*)(int32))(t_1))( /* STOP !ERROR! */ );
  # STOP cannot resolve value of a in this context
  # however a:
  # return fn kConversionMethodsTable[typeOf(a)][t](a)
  # will work, because in this deferred context, a is resovlable (when it's called in runtime scope)
  # v however here
  return fn converter(a)
  # coverter is found at compile time
end

>>

puts(<< convertTo($getRandomInteger(), String) >>())

```

Need function overloading, especially if we want common functions that can be used for arbitrary types.
The idea originally was to allow a sort of interface for the parameters and let the compiler figure it out?

```melody

<<

let myWrap = fn (f_: Function)
  let makeRtComponent = fn
    let didHit := false

    fn getHit didHit := true
    fn gotHit didHit

    return {
      getHit, gotHit
    }
  end

  return fn
    let c := makeRtComponent()
    let rv = f_(c.getHit)
    tellRtHit(c.gotHit())
    return rv
  end
end

>>

<<
myWrap(fn (f_: fn (): Boolean)
  if someRtThingWorksOut()
    f_()
  end
end) \
>>()

<<
myWrap(fn (f_: fn (): Boolean)
  return 10
end)
>>

```

Think about it, there's a strong "you call it, you buy it thing" going on.
Consider interface methods:
```melody

let add = fn (a is Number, b is Number)
  return a + b
end

let c = 1
let d := 2
puts(add(1, 2))

```

**!!!**
There's a lot going on here. So more verbosely:

```melody

# In order of priority on the AST
# 0   2   1 2  35 4  5       5  4 5
  let add = fn (a is Number, b is Number)
    return a + b
  end
  # numeric literal 1 has exactly one type, and many interfaces
  # type: Integer32(Void)
  # interfaces:
  # - Number
  # - Integer
  # - Addable
  # - Subtractable
  # - Dividable
  # - Multipliable
  let c = 1
  # D here is slightly different
  # type: Integer32(Writable)
  # and an additional interface
  # - Writable
  let d := 2

```

Function look up

Checking returns is occasionally possible, the same is true for arguments for that matter.

```melody

# v depends on the types for a and b
a, b = func(c, d)

```

```melody
let foo = fn (a is Number, b is Number)
  # error, 
  return 2*a + b + 10
end

# All builtins tend to be like this
let Integer32 = fn (additional is Interface)
  let 'let' = fn (x is __IntergerExpression)

    let more = fn
      if additional = Writable
        return table ':=' = __i32_set
      else
        return null
      end
    end()

    return table
      ...more,
      '=' = __i32_equality,
      '+' = __i32_addition,
      '-' = __i32_subtraction,
      '*' = __i32_multiplication
    end
  end

  return table
    'let' = .'let' # still need an "identification" operator, that or a way to access the current context using a string
  end
end

```

### There is another problem to solve

Type forwarding, a chicken and egg problem.

### Another look at generics

```melody
# how does type resolution work here?
# perhaps we could have a "partial" resolution?
# which still is an "Unresolved" type
let RectangleTemplate = fn (scalar: number type)
  return table
    new = fn (x: scalar, y: scalar, width: scalar = 10, height: scalar = 10)
      let bottom = fn () inst.x + inst.width
      let right  = fn () inst.y + inst.height

      return let inst = table
        x := x,
        y := y,
        width := width,
        height := height,
        bottom = bottom,
        right = right
      end
    end
  end
end

# deference would have to save the day here
# but how would you reference this function?
# it would depend on how references work in general
let myFormioli = fn (a: number, b: number)
  return a*10 + b + 1
end

myFormioli(1, 1.0)
myFormioli(1, 2)
myFormioli(MyDecimal.new(3), 2)
# some sort of MyDecimal['*$IntegerLiteral'] (returning a MyDecimal)
# then some sort of MyDecimal['+$Integer'] (return a MyDecimal)
# and then MyDecimal['+$IntegerLiteral'] (return a MyDecimal)
# conclusion: "myFormioli(MyDecimal.new(3), 2)" returns a MyDecimal

# can't evaluate "askForMyDecimal()"
# as its value is unresolvable

<< # perhaps runtime code actually should live here...
# types *must* be resolvable now

puts(myFormioli(askForMyDecimal(), 3))
>>

let MyDecimal = type table
  # in lieu of overloading?
  $'+' = fn (rhs: number): MyDecimal
  $'*' = fn (rhs: number): MyDecimal
  asString = fn: String
end

let RectangleI = RectangleTemplate(Integer)
let RectangleF = RectangleTemplate(Float)
let RectangleR = RectangleTemplate(Rational)
<<
let a = RectangleI.new(5, 5)
puts(a.bottom())
>>

let Rational = type table

end

```

Deference and Unresolved, and partial resolution are quickly becoming things

### Starting language syntax

```
# general statements
let ...
<any valid sub-expression>

# sub expressions
1
a
's'
1 + <any valid sub-expression>
a + <any valid sub-expression>
's' + <any valid sub-expression>
(<any valid sub-expression>)
a(<any valid sub-expression>)
# literally blank
```
#### unary operators:
- let

#### binary operators
- <call>
- `+`
- `:=`
- `*`
- `-`

#### calling syntax
```
foo parameter
foo 'hello', 0
foo()
```