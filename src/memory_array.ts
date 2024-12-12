// simulate linear memory

import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';

const { freeze } = Helpers;

function construct(mSlotCapacity: number = 2048) {
  const mSlots = Array<ContextVariable | undefined>(mSlotCapacity);
  function verifySlotNumber(slot: number) {
    if (slot >= 0 && slot < mSlots.length)
      { return; }
    throw new Error(`Slot number (${slot}) is inaccessible`);
  }
  const inst = freeze({
    load(slot: number): ContextVariable {
      verifySlotNumber(slot);
      return mSlots[slot] ??= ContextVariable.make();
    },
    store(slot: number, cvar: ContextVariable): void {
      verifySlotNumber(slot);
      cvar.copyTo( mSlots[slot] ??= ContextVariable.make() );
    }
  });
  return inst;
}

export const MemoryArray = freeze({
  make: () => construct(),
  stackPointerLocation: () => 0
});
export type MemoryArray = ReturnType<typeof construct>;
