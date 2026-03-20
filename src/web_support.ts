// NOTE This file is considered out of scope for Melody
//      these utilities are added for use with the frontend

import { Compiler } from './compiler';
import { Helpers } from './helpers';

const { freeze, expose } = Helpers;

function getEntryPointOnInst(instance: WebAssembly.Instance | undefined): (dummyReceiver: number) => void {
  const exports = instance?.exports;
  if (exports && 'entry' in exports) {
    return exports.entry as (dummyReceiver: number) => void;
  } else {
    throw new Error('Failed to find entry point in WASM exports');
  }
}

function narrowToCompiler(compilerOrSource: Compiler | string): Compiler {
  if (typeof compilerOrSource === 'string') {
    return Compiler.make(compilerOrSource);
  }
  return compilerOrSource;
}

async function getEntryPointWithMemory
  (memory: WebAssembly.Memory,
   compilerOrSource: Compiler | string): Promise<(dummyReceiver: number) => void>
{
  const compiler = narrowToCompiler(compilerOrSource);
  const importsObject = {
    ...compiler.importsObject(),
    js: { memory }
  }  as WebAssembly.Imports;

  const byteCode = compiler.byteCode();
  if (!byteCode) {
    throw new Error(`Failed to compile Melody source: ${compiler.error()}`);
  }
  const result = await WebAssembly.instantiate(byteCode, importsObject);
  if ('instance' in result) {
    const res = result as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    return getEntryPointOnInst(res.instance);
  }
  return getEntryPointOnInst(result); 
}

export const WebSupport = freeze({
  forTesting: { getEntryPointWithMemory },
  async getEntryPoint(compilerOrSource: Compiler | string) {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
    });
    for (let i = 0; i < 5000; ++i)
      new DataView(memory.buffer).setInt32(i*4, 4);
   return getEntryPointWithMemory(memory, compilerOrSource);
  }
});

expose({ WebSupport });
