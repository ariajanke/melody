/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { Compiler } from '../src/compiler';
import { WebSupport } from '../src/web_support';
import { EndToEndHelpers, EntryPointGetter } from './end_to_end_helpers';

describe('happy path end-to-end', () => {
  const {
    compileFromSource,
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
    describe('with a compiler', () => {
      const { getEntryPointWithMemory } = WebSupport.forTesting;

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
              if (str === '\n')
                { return; }
              printedStrings.push(str);
            }
          });
         const { byteCode } = compiler;
         expect(byteCode()).toBeDefined();
         const memory = makeMemoryFilledWith(200);
         getEntryPointWithMemory(memory, compiler).
           then(entry => {
             entry();
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
  });

  ([
    [compileFromSource, 'compiler'],
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

        // [f1, .f1] are delegated
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

        doRun(`can perform a mutation cross frame`, `
          let a := 5
          let b = 1
          let f1 = fn
            let f2 = fn
              a := 6
            ~
            f2()
            puts(a)
            a := 7
          ~
          f1()
          puts(a)
          `, ['6', '7']);

        doRun(`Receiver pointer mix up case`, `
          let a := 5
          let f = fn
            a := 6
          ~
          let g = fn
            let g2 := f
            g2()
            puts(a)
          ~
          g()
          `, ['6']);

        doRun('table access', `
          SystemIO.puts('table test!')
          SystemIO.puts('asking for an Integer: ', SystemIO.askInteger())
          let b = (SystemIO.assignable := 15)
          SystemIO.puts('your assignable integer was ', b)
        `, [
          'table test!',
          'asking for an Integer: ', '42',
          'SystemIO assignable set with ', '15',
          'your assignable integer was ', '15'
        ]);

        it(`Fails to find modifier for a different fType`, () => {
          const source = `
            let f = fn
            ~
            let g = fn
              let g2 := f
              let g3 := fn
              ~
              g3 := g2
            ~
            g()
          `;
          const compiler = Compiler.make(source);
          expect(compiler.byteCode()).toBeUndefined();
          expect(compiler.error()).toMatch('cannot find function "g3:=" on receiver*');
        });
      });
    });
  });
});
