import { Helpers } from './helpers';
import { MemoryArray } from './memory_array';

const { freeze } = Helpers;

const kParentAccessIndex = 0;
const kReservedBytesForParent = MemoryArray.kWordSizeInBytes;

export const ContextTypeReservations = freeze({
  kParentAccessIndex,
  kReservedBytesForParent
});
