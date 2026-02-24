import { Helpers } from './helpers';

const { freeze } = Helpers;

const kWordSizeInBytes = 4;
// const kStackPointerLocation = 0;
// const kStartOfStack = kStackPointerLocation + kWordSizeInBytes;

function construct(mSlotCapacity: number = 2048) {
  const mSlots = Array<number | undefined>(mSlotCapacity);
  function verifySlotNumber(slot: number) {
    if (slot % kWordSizeInBytes !== 0) {
      throw new Error('slot number must be divisible by four');
    }
    if (slot >= 0 && slot < mSlots.length)
      { return slot / kWordSizeInBytes; }
    throw new Error(`Slot number (${slot}) is inaccessible`);
  }
  const inst = freeze({
    load(slot: number): number {
      slot = verifySlotNumber(slot);
      return mSlots[slot] ??= Infinity;
    },
    store(slot: number, cvar: number): void {
      slot = verifySlotNumber(slot);
      mSlots[slot] = cvar;
    }
  });
  return inst;
}

export const MemoryArray = freeze({
  make: () => construct(),
  kWordSizeInBytes,
  // kStackPointerLocation,
  // kStartOfStack
});
export type MemoryArray = ReturnType<typeof construct>;
