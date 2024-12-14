// simulate linear memory

// import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';

const { freeze } = Helpers;

function construct(mSlotCapacity: number = 2048) {
  const mSlots = Array<number | undefined>(mSlotCapacity);
  function verifySlotNumber(slot: number) {
    if (slot >= 0 && slot < mSlots.length)
      { return; }
    throw new Error(`Slot number (${slot}) is inaccessible`);
  }
  const inst = freeze({
    load(slot: number): number {
      verifySlotNumber(slot);
      return mSlots[slot] ??= Infinity;
    },
    store(slot: number, cvar: number): void {
      verifySlotNumber(slot);
      mSlots[slot] = cvar;
      // cvar.copyTo( mSlots[slot] ??= Infinity );
    }
  });
  return inst;
}

export const MemoryArray = freeze({
  make: () => construct(),
  stackPointerLocation: () => 0
});
export type MemoryArray = ReturnType<typeof construct>;
