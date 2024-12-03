import { Helpers } from '../helpers';
import { SimpleCounter, type FuncImportDescription } from './wasm_helpers';
import { WasmTypesSection } from './wasm_types_section';
import { WasmImportsSection } from './wasm_imports_section';

const { freeze, memoize } = Helpers;

export const WasmBuiltinImportsCreation = (() => {
  const sDescriptionsCounter = SimpleCounter.make();

  const class_ = freeze({
    cloneDescriptionsCounter() {
      class_.descriptions();
      return sDescriptionsCounter.clone();
    },
    descriptions: memoize((): { [name: string]: FuncImportDescription | undefined } => {
      const { i32 } = WasmTypesSection.wasmTypes();
      const { next } = sDescriptionsCounter;
      
      return freeze({
        printInteger: {
          index  : next(),
          args   : [i32],
          returns: []
        },
        printString: {
          index  : next(),
          args   : [i32],
          returns: []
        },
        askString: {
          index  : next(),
          args   : [],
          returns: [i32]
        },
        askInteger: {
          index  : next(),
          args   : [],
          returns: [i32] 
        }
      });
    }),
    make: (mStringPool: string[],
           mJsPrint: (s: string | number) => void,
           mJsAskInteger: () => number,
           mJsAskString: () => number) =>
    {
      
      const imports = {
        printInteger(i: number) {
          mJsPrint(i);
        },
        printString(i: number) {
          mJsPrint(mStringPool[i]);
        },
        askString: mJsAskString,
        askInteger: mJsAskInteger
      };
      const { descriptions } = class_;
      const getDescription = (name: string) =>
        class_.descriptions()[name] ?? (() => {
          throw new Error(`no such "${name}"`);
        })();
      const inst = freeze({
        importObject: memoize(() => freeze({ imports })),
        typesSection: memoize(() => {
          let typeSec = WasmTypesSection.make();
          Object.keys(descriptions()).forEach((name: string) => {
            const { args, returns } = getDescription(name);
            typeSec = typeSec.pushFunction(args, returns);
          });
          return typeSec;
        }),
        importsSection: memoize(() => {
          let imptSec = WasmImportsSection.make();
          const typeSec = inst.typesSection();

          Object.keys(descriptions()).forEach((name: string) => {
            const { args, returns } = getDescription(name);
            const index = typeSec.indexFor( args, returns );
            if (index === undefined) {
              throw new Error(`Index for "${name}" not defined`);
            }
            console.log(name, index);
            imptSec = imptSec.pushFunction(index, 'imports', name);
          });
          return imptSec;
        })
      });
      return inst;
    }
  });
  return class_;
})();
export type WasmBuiltinImportsCreation = ReturnType<typeof WasmBuiltinImportsCreation.make>;
