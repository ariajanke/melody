import { EndToEndHelpers, EntryPointGetter } from './end_to_end_helpers';

describe('end-to-end', () => {
  const {
    compileFromSource,
    interpretFromSource,
    makeExampleRunner
  } = EndToEndHelpers;

  ([
    [compileFromSource, 'compiler'],
    [interpretFromSource, 'interpreter']
  ] as [
    EntryPointGetter,
    string
  ][]).forEach(([getEntryPoint, name]) => {
    describe(`with a ${name}`, () => {
      const doRun = makeExampleRunner(getEntryPoint);

      xdescribe('basic functionality', () => {
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

      xdescribe('tuple trouble', () => {
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

      xdescribe('variable scope', () => {
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
