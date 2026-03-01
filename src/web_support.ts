// NOTE This file is considered out of scope for Melody
//      these utilities are added for use with the frontend

import { Compiler } from './compiler';
import { Helpers } from './helpers';

const { freeze, expose } = Helpers;

function getEntryPointOnInst(instance: WebAssembly.Instance | undefined) {
  const exports = instance?.exports;
  if (exports && 'entry' in exports) {
    return exports.entry as (dummyReceiver: number) => void;
  } else {
    throw new Error('Failed to find entry point in WASM exports');
  }
}

async function getEntryPointWithMemory
  (memory: WebAssembly.Memory,
   compiler: Compiler): Promise<(dummyReceiver: number) => void>
{
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
  async getEntryPoint(compiler: Compiler) {
    const memory = new WebAssembly.Memory({
      initial: 1024,
      maximum: 1024,
    });
    for (let i = 0; i < 5000; ++i)
      new DataView(memory.buffer).setInt32(i*4, 4);
   return getEntryPointWithMemory(memory, compiler);
  }
});

expose({ WebSupport });
