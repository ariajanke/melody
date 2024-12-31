import { TestHelpers } from './test_helpers';
import { MemoryArray } from '../src/memory_array';
import { ContextType } from '../src/context_type';
import { PersistentStack } from '../src/persistent_stack';
import { VastInterpreter } from '../src/vast_interpreter';
import { VariableDeclarationFunctionTable } from '../src/variable_declaration_function_table';
import { StringType } from '../src/string_type';
import { StringPool } from '../src/string_pool';
import { VastCompiler } from '../src/vast_compiler';
import { Helpers } from '../src/helpers';

const { describeNamed } = TestHelpers;
const { presenceAsserted } = Helpers;

describeNamed({ VastInterpreter }, () => {
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

  function runRunner(runner: VastInterpreter | VastCompiler): Promise<void> {
    const runnerAsCompiler = <Type>(fn: (compiler: VastCompiler) => Type): Type =>
      fn(presenceAsserted(() => runner as VastCompiler)());
    const runnerAsInterpreter = <Type>(fn: (compiler: VastInterpreter) => Type): Type =>
      fn(runner as VastInterpreter);
    if ((runner as VastCompiler).compile !== undefined) {
      return runnerAsCompiler((compiler: VastCompiler) => {
        const params = compiler.compile();
        if (!params) {
          throw new Error(compiler.errors()[0].message);
        }
        const memory = new WebAssembly.Memory({
          initial: 1024,
          maximum: 1024,
        });
        for (let i = 0; i < 5000; ++i)
          new DataView(memory.buffer).setInt32(i*4, 4);
        const [code, imports] = params;
        const assembled = WebAssembly.instantiate(code, { ...imports, js: { mem: memory } });
        return assembled.then((inst: WebAssembly.WebAssemblyInstantiatedSource) => {
          const entry = inst.instance.exports.entry as CallableFunction;
          entry();
        });
      });
    } else if ((runner as VastInterpreter).interpret !== undefined) {
      return runnerAsInterpreter((intepreter: VastInterpreter) =>
        (new Promise((resolve: (_0: unknown) => void, _1: () => void) => { resolve(undefined); })).
          then(() => {
            intepreter.interpret();
          }));
    }
    throw new Error('impossible branch?');
  }

  describe('integration specs', () => {
    [
      { runnerDoes: 'interprets', makeRunner: VastInterpreter.make },
      { runnerDoes: 'compiles'  , makeRunner: VastCompiler.make    }
    ].forEach(({ runnerDoes, makeRunner }) => {
      it(`${runnerDoes} and runs a "hello world!" program with three parameters`, (done: () => void) => {
        const { printedStrings, putsFunction } = makePutsFunction();
        // In WASM:
        // generates a function that does nothing
        // signature expects an i32? yes by all appearences
        // but it doesn't even bother emitting the puts call
        const runner = makeRunner("puts('hello', 'there', ' world!')", {
          ...VastInterpreter.defaultInjections(),
          putsFunction
        });
        runRunner(runner).then(() => {
          expect(printedStrings).toEqual(['hello', 'there' ,' world!']);
          done();
        }).catch(done);
      });

      it(`${runnerDoes} and runs a simple adder program`, (done: () => void) => {
        const { printedStrings, putsFunction } = makePutsFunction();
        const runner = makeRunner(`
          let a := 2
          let b := a + 2
          puts(b)
        `, {
          ...VastInterpreter.defaultInjections(),
          putsFunction
        });
        runRunner(runner).then(() => {
          expect(printedStrings).toEqual(['4']);
          done();
        }).catch(done);
      });

      it(`${runnerDoes} and runs a program with tuples as variables`, (done: () => void) => {
        const { printedStrings, putsFunction } = makePutsFunction();
        const runner = makeRunner(`
          let a := 3
          let b := (a, 2)
          puts(b, 4)
        `, {
          ...VastInterpreter.defaultInjections(),
          putsFunction
        });
        runRunner(runner).then(() => {
          expect(printedStrings).toEqual(['3', '2', '4']);
          done();
        }).catch(done);
      });
    });
    
    it('interprets and runs a "hello world!" program with a variable', () => {
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
      const spOffset = 4;
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

    it('interprets and runs a multiline "hello world!" program', () => {
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = VastInterpreter.
        make("puts('hello')\nputs('world!')", {
          ...VastInterpreter.defaultInjections(),
          putsFunction
        });
      ranInterpreterOk(interpreter);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('interprets and runs a "hello world!" program with an assignment', () => {
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

    it('interprets and runs a simple program with a let declaration', () => {
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


    it('interprets and runs a program with simple functions', () => {
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
