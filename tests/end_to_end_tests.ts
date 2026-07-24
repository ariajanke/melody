import { Compiler } from '../src/compiler';
import { MemoryArray } from '../src/memory_array';
import { WebSupport } from '../src/web_support';
import { EndToEndHelpers, EntryPointGetter } from './end_to_end_helpers';

describe('end-to-end', () => {
  const {
    compileFromSource,
    // interpretFromSource,
    makeExampleRunner,
    errorHandler
  } = EndToEndHelpers;
  function makeMemoryFilledWith(num: number): WebAssembly.Memory {
    const kWasmPageSizeInBytes = 65536 - 4; // wtf
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
    });
    for (let i = 0; i < kWasmPageSizeInBytes; ++i) {
      new DataView(memory.buffer).setInt32(i, num, true);
    }
    return memory;
  }
  describe('parent pointer sanity check', () => {
    const source = `
      puts('Hello world!')
    `;
    // Happy Canary does not die, happy canary appears on success
    const kCanaryValue = 123456789;
    describe('with a compiler', () => {
      const { getEntryPointWithMemory } = WebSupport.forTesting;

      it('stores the parent pointer at the expected location', (done: () => void) => {
        const compiler = Compiler.make(source);
        const { byteCode } = compiler;
        expect(byteCode()).toBeDefined();
        const memory = makeMemoryFilledWith(200);
        getEntryPointWithMemory(memory, compiler).
          then(entry => {
            entry(kCanaryValue);
            const parentPointerValue = new DataView(memory.buffer).getInt32(0, true);
            expect(parentPointerValue).toBe(kCanaryValue);
            done();
          }).catch(errorHandler(done));
      });

      it('restores the stack pointer correctly', (done: () => void) => {
        // this is double test :/
        const aVal = 123;
        const printedStrings: string[] = [];
         const compiler = Compiler.make(`
           let a := ${aVal}
           puts('Hello world!')
           puts(a)
         `, {
            ...Compiler.defaultInjections(),
            puts(str: string) {
              printedStrings.push(str);
            }
          });
         const { byteCode } = compiler;
         expect(byteCode()).toBeDefined();
         const memory = makeMemoryFilledWith(200);
         getEntryPointWithMemory(memory, compiler).
           then(entry => {
             entry(0);
             const valueOfA = new DataView(memory.buffer).getInt32(0, true);
             expect(valueOfA).toBe(aVal);
             expect(printedStrings).toEqual(['Hello world!', `${aVal}`]);
             done();
           }).catch(errorHandler(done));
      });

      makeExampleRunner(compileFromSource)(`runs a simple load within a function`, `
        let f = fn
          let a = 10
          puts(a)
        ~
        f()
      `, ['10']);
    });
    
    // describe('with an interpreter', () => {
    //   // because root takes a parent pointer too, we can write this test
    //   it('stores the parent pointer at the expected location', () => {
    //     const memory = MemoryArray.make();
    //     memory.store(0, 0);
    //     const makeMemory = (): MemoryArray => memory;
        
    //     const interpreter = Interpreter.make(source, {
    //       ...Interpreter.defaultInjections(),
    //       makeMemory
    //     });
    //     expect(interpreter.run()).toBe(true);
    //     const parentPointerValue = memory.load(0);
    //     expect(parentPointerValue).toBe(kCanaryValue);
    //   });
    // });
  });

  ([
    [compileFromSource, 'compiler'],
    // [interpretFromSource, 'interpreter']
  ] as [
    EntryPointGetter,
    string
  ][]).forEach(([getEntryPoint, name]) => {
    describe(`with a ${name}`, () => {
      const doRun = makeExampleRunner(getEntryPoint);

      describe('basic functionality', () => {
        doRun(`runs "Hello World!"`, `
          puts('Hello world!')
        `, ['Hello world!']);

        doRun(`runs simple arithmetic`, `
          let a = 1 + 2 * 3
          let b = a - 4
          puts(a, b)
        `, ['7', '3']);
          
        doRun(`runs function call`, `
          let f = fn
            puts('Hello world!')
          ~
          f()
        `, ['Hello world!']);

        doRun(`runs a simple load and store`, `
          let a := 10
          a := 5
          puts(a)
        `, ['5']);

        doRun(`runs function object reassignment`, `
          let f := fn
            puts('Hello world!')
          ~
          f := fn
            puts('Goodbye world!')
          ~
          f()
        `, ['Goodbye world!']);
      });

      describe('tuple trouble', () => {
        doRun(`runs tuple assignment`, `
          let (a, b) = (1, 2)
          puts(a, b)
        `, ['1', '2']);

        doRun(`runs tuple assignment with expressions`, `
          let (a, b) = (1 + 2, 3 * 4)
          puts(a, b)
        `, ['3', '12']);

        doRun(`runs tuple assignment to a tuple`, `
          let t = (1, 2)
          let (a, b) = t
          puts(a, b)
        `, ['1', '2']);
      });


      describe('variable scope', () => {
        doRun(`runs function that accesses parent's variable`, `
          let a = 10
          let f = fn
            puts(a)
          ~
          f()
        `, ['10']);

        doRun(`runs function that accesses grandparent's variable`, `
          let a = 10
          let f1 = fn
            let f1a = fn
              puts(a)
            ~
            f1a()
          ~
          f1()
        `, ['10']);

        doRun(`runs function that indirectly accesses parent's variable`, `
          let a = 10
          let f1 = fn
            puts(a)
          ~
          let f2 = fn
            let a = 20
            f1()
          ~
          f2()
        `, ['10']);

        doRun(`runs function that overrides parent's variable`, `
          let a = 10
          let f1 = fn
            let a = 20
            puts(a)
          ~
          f1()
        `, ['20']);
      });
    });
  });
});
