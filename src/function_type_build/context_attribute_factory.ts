import { Helpers } from '../helpers';
import { FunctionType, ObjectType } from '../function_type_build';
import { TupleObjectFactory } from './tuple_type';
import { CodeWriter } from '../code_writer';
import { MemoryArray } from '../memory_array';

const { freeze, memoize } = Helpers;

const kBytesPerWord = MemoryArray.kWordSizeInBytes;

function inPlainOrder(limit: number, fn: (idx: number) => void) {
  for (let i = 0; i < limit; ++i) {
    fn(i);
  }
}

function inReverseOrder(limit: number, fn: (idx: number) => void) {
  for (let i = limit - 1; i >= 0; --i) {
    fn(i);
  }
}

function forEachWord
  (ordering: (limit: number, fn: (idx: number) => void) => void,
  varType: ObjectType,
  fn: (offset: number) => void)
{
  const additional = varType.sizeInBytes() % kBytesPerWord === 0 ? 0 : 1;
  const sizeInWords_ = (varType.sizeInBytes() / kBytesPerWord) + additional;
  ordering(sizeInWords_, fn);
}

export const ContextAttributeFactory = freeze({
  kBytesPerWord,
  buildSetter(accessIndex: number, type: ObjectType, getter?: FunctionType): FunctionType {
    return freeze({
      parameters: () => type,
      returns: () => getter ? type : TupleObjectFactory.emptyTuple(),
      emit(writer: CodeWriter) {
        forEachWord(inPlainOrder, type, (additional: number) => {
          writer.storeInteger(accessIndex + additional*kBytesPerWord);
        });

        if (!getter)
          { return writer; }

        // NOTE reach for "name:=" setters
        return writer.drop() && getter.emit(writer);
      },
      uid: memoize(Symbol)
    });
  },
  buildGetter(accessIndex: number, type: ObjectType): FunctionType {
    return freeze({
      parameters: () => TupleObjectFactory.emptyTuple(),
      returns: () => type,
      emit(writer: CodeWriter) {
        forEachWord(inReverseOrder, type, (additional: number) => {
          writer.loadInteger(accessIndex + additional*kBytesPerWord);
        });
        return writer;
      },
      uid: memoize(Symbol)
    });
  }
});
