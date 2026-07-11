import { Helpers, raise } from '../helpers';
import { FunctionType, ObjectType } from '../function_type_build';
import { TupleObjectFactory } from './tuple_type';
import { CodeWriter } from '../code_writer';
import { MemoryArray } from '../memory_array';
import { FunctionTypeBase } from './function_type_base';
import { TupleFunctionTypeBuild } from './tuple_function_type_build';

const { freeze } = Helpers;

const kBytesPerWord = MemoryArray.kWordSizeInBytes;

function inPlainOrder(limit: number, fn: (idx: number) => void): void {
  for (let i = 0; i < limit; ++i) {
    fn(i);
  }
}

function inReverseOrder(limit: number, fn: (idx: number) => void): void {
  for (let i = limit - 1; i >= 0; --i) {
    fn(i);
  }
}

function forEachWord
  (ordering: (limit: number, fn: (idx: number) => void) => void,
  varType: ObjectType,
  fn: (offset: number) => void): void
{
  const additional = varType.sizeInBytes() % kBytesPerWord === 0 ? 0 : 1;
  const sizeInWords_ = (varType.sizeInBytes() / kBytesPerWord) + additional;
  ordering(sizeInWords_, fn);
}

function assertSingleItemReceiver(receiverFtype: FunctionType) {
  const { emptyTuple } = TupleObjectFactory;
  if (receiverFtype.parameters().uid() !== emptyTuple().uid() ||
      receiverFtype.receiver  ().uid() !== emptyTuple().uid() ||
      receiverFtype.returns   ().sizeInStackItems() !== 1)
  { raise('receiver assumptions'); }
}

export const ContextAttributeFactory = freeze({
  buildSetter(accessIndex: number, type: ObjectType, getter?: FunctionType): FunctionType {
    const { emptyTuple } = TupleObjectFactory;
    return freeze({
      // ...FunctionTypeBase.receivedByContext(),
      ...FunctionTypeBase.makeDefaults(),
      parameters: () => type,
      returns: () => getter ? type : emptyTuple(),
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        assertSingleItemReceiver(receiverFtype);
        if (parameterFtype.returns   ().uid() !== type.uid() ||
            parameterFtype.receiver  ().uid() !== emptyTuple().uid() ||
            parameterFtype.parameters().uid() !== emptyTuple().uid())
        {
          raise('parameter assumptions');
        }

        // we have no idea how many parameter "items" there are
        // we can't intersperse our target

        // HACK to reduce instructions
        if (parameterFtype.returns().sizeInStackItems() === 1) {
          receiverFtype.simpleEmit(writer);
          writer.pushRepresentation(accessIndex).addIntegers();
        }

        parameterFtype.simpleEmit(writer);

        forEachWord(inPlainOrder, type, (additional: number) => {
          // HACK to reduce instructions
          if (parameterFtype.returns().sizeInStackItems() !== 1) {
            receiverFtype.simpleEmit(writer);
            writer.
              pushRepresentation(accessIndex + additional*kBytesPerWord).
              addIntegers();
            // !!NEED NOW!! swap top two items on WASM stack
          }
          
          writer.storeInteger();
        });

        if (!getter)
          { return; }

        // NOTE reach for "name:=" setters
        getter.emit(receiverFtype, TupleFunctionTypeBuild.emitEmpty(), writer);
      },
      // emit(writer: CodeWriter): void {
      //   forEachWord(inPlainOrder, type, (additional: number) => {
      //     writer.storeInteger(accessIndex + additional*kBytesPerWord);
      //   });

      //   if (!getter)
      //     { return; }

      //   // NOTE reach for "name:=" setters
      //   writer.drop();
      //   getter.emit(writer);
      // }
    });
  },
  buildReceiverGetter(accessIndex: number, type: ObjectType): FunctionType {
    // this is where our stack point becomes very important
    // in order for receiver resolution to work, it must be a "base case"
    // for the call/receiver dynamic... i.e. I must be able to call/emit code
    // for a receiver without needing one
    if (type.sizeInStackItems() !== 1) {
      raise('a receiver must always be exactly one pointer/stack item in size');
    }
    return freeze({
      ...FunctionTypeBase.makeDefaults(),
      returns: () => type,
      simpleEmit(writer: CodeWriter) {
        writer.
          pushStackPointer().
          pushRepresentation(accessIndex).
          addIntegers().
          loadInteger();
      },
    });
  },
  buildGetter(accessIndex: number, type: ObjectType): FunctionType {
    
    return freeze({
      // ...FunctionTypeBase.receivedByContext(),
      ...FunctionTypeBase.makeDefaults(),
      returns: () => type,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        assertSingleItemReceiver(receiverFtype);
        if (parameterFtype.uid() !== TupleFunctionTypeBuild.emitEmpty().uid())
          { raise('parameters assumptions'); }
        forEachWord(inReverseOrder, type, (additional: number) => {
          receiverFtype.simpleEmit(writer);
          writer.
            pushRepresentation(accessIndex + additional*kBytesPerWord).
            addIntegers().
            loadInteger();
        });
      },
      // emit(writer: CodeWriter): void {
        
      // }
    });
  }
});
