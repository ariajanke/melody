import { TestHelpers } from './test_helpers';
import { MemoryArray } from '../src/memory_array';
import { ContextType } from '../src/context_type';
import { PersistentStack } from '../src/persistent_stack';
import { VastInterpreter } from '../src/vast_interpreter';
import { VariableDeclarationFunctionTable } from '../src/variable_declaration_function_table';
import { StringType } from '../src/string_type';
import { StringPool } from '../src/string_pool';
import { VastCompiler } from '../src/vast_compiler';

const { describeNamed } = TestHelpers;

describeNamed({ VastInterpreter }, () => {
  VastCompiler.make('');
  function makePutsFunction() {
    const printedStrings: string[] = [];
    const putsFunction = (str: string) => { printedStrings.push(str); };

    return { putsFunction, printedStrings };
  }

  function ranInterpreterOk(interpreter: VastInterpreter) {
    if (!interpreter.interpret()) {
      throw new Error(interpreter.errors()[0].message);
    }
  }

  describe('integration specs', () => {
    it('compiles and runs a "hello world!" program', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.make("puts('hello', 'there', ' world!')", {
        ...VastInterpreter.defaultInjections(),
        putsFunction
      });

      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello', 'there' ,' world!']);
    });

    it('compiles and runs a "hello world!" program with a variable', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const stringPool = StringPool.makeForStrings(() => ['hello world!']);
      const makeStringPool = () => stringPool;
      const contextType = ContextType.makeWritable();

      const makeContextType = () => contextType;
      const memory = MemoryArray.make();
      const stack = PersistentStack.make<number>(() => Infinity);
      const fooTable = VariableDeclarationFunctionTable.
        make(StringType.instance(), ':=', 0);
      
      contextType.pushFunctionTableByName('.foo', fooTable);
      const spOffset = 1;
      memory.store(fooTable.offset() + spOffset, 0);

      const interpreter = VastInterpreter.make('puts(foo)', {
        ...VastInterpreter.defaultInjections(),
        makeMemory : () => memory,
        makeStack  : () => stack,
        putsFunction,
        makeStringPool,
        makeContextType
      });

      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a multiline "hello world!" program', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.
        make("puts('hello')\nputs('world!')", {
          ...VastInterpreter.defaultInjections(),
          putsFunction
        });
      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('compiles and runs a "hello world!" program with an assignment', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const stringPool = StringPool.makeForStrings(() => ['hello world!']);
      const contextType = ContextType.makeWritable();
      const fooTable = VariableDeclarationFunctionTable.
        make(StringType.instance(), ':=', 0);
      
      contextType.pushFunctionTableByName('.foo', fooTable);
      const makeContextType = () => contextType;
      const interpreter = VastInterpreter.make(`
        foo := 'hello world!'
        puts(foo)
      `, {
        ...VastInterpreter.defaultInjections(),
        putsFunction,
        makeContextType,
        makeStringPool: () => stringPool
      });
      ranInterpreterOk(interpreter);

      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple program with a let declaration', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.make(`
        let a := 'hello world!'
        puts(a)
      `, {
        ...VastInterpreter.defaultInjections(),
        putsFunction
      });
      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple adder program', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.make(`
        let a := 2
        let b := a + 2
        puts(b)
      `, {
        ...VastInterpreter.defaultInjections(),
        putsFunction
      });
      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['4']);
    });

    it('compiles and runs a program with simple functions', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.make(`
        let a := fn
          puts('world')
        ~
        let b := fn puts('hello')
        
        b()
        a()
      `, {
        ...VastInterpreter.defaultInjections(),
        putsFunction
      });
      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello', 'world']);
    });
  });
});
