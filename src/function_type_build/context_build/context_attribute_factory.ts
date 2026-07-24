import { Helpers, raise } from '../../helpers';
import { FunctionType, ObjectType } from '../../function_type_build';
import { TupleObjectFactory } from '../tuple_type_factory';
import { CodeWriter } from '../../code_writer';
import { MemoryArray } from '../../memory_array';
import { FunctionTypeBase } from '../function_type_base';

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

function makeBuildSetter(returnsItself: boolean) {
  return (accessIndex: number, type: ObjectType): FunctionType => {
    const { emptyTuple } = TupleObjectFactory;
    const getter = returnsItself ? ContextAttributeFactory.buildGetter(accessIndex, type) : undefined;
    const emit = (receiverFtype: FunctionType,
                  parameterFtype: FunctionType,
                  writer: CodeWriter): void =>
    {
      assertSingleItemReceiver(receiverFtype);
      if (parameterFtype.returns   ().uid() !== type.uid() ||
          parameterFtype.receiver  ().uid() !== emptyTuple().uid() ||
          parameterFtype.parameters().uid() !== emptyTuple().uid())
      {
        raise('parameter assumptions');
      }

      // HACK to reduce instructions
      if (parameterFtype.returns().sizeInStackItems() === 1) {
        receiverFtype.simpleEmit(writer);
        writer.pushInteger(accessIndex).addIntegers();
        parameterFtype.simpleEmit(writer);
        writer.storeInteger();
      } else {
        parameterFtype.simpleEmit(writer);

        forEachWord(inPlainOrder, type, (additional: number) => {
          // HACK to reduce instructions
          receiverFtype.simpleEmit(writer);
          writer.
            pushInteger(accessIndex + additional*kBytesPerWord).
            addIntegers();
          // raise('I need a "swap top two items on WASM stack" defined for code writer!');        

          writer.swapTopTwo();
        });
      }

      if (!getter)
        { return; }

      // NOTE reached by "name:=" setters
      getter.emit(receiverFtype, FunctionTypeBase.emitEmptyTuple(), writer);
    };

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      parameters: () => type,
      returns: () => getter ? type : emptyTuple(),
      emit
    });
  };
}

function buildReceiverGetter
  (accessIndex: number, type: ObjectType): FunctionType
{
  if (type.sizeInStackItems() !== 1) {
    raise('a receiver must always be exactly one pointer/stack item in size');
  }
  return freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    returns: () => type,
    simpleEmit(writer: CodeWriter) {
      writer.
        pushStackPointer().
        pushInteger(accessIndex).
        addIntegers().
        loadInteger();
    },
  });
}

function buildGetter
  (accessIndex: number, type: ObjectType): FunctionType
{
  return freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    returns: () => type,
    emit(receiverFtype: FunctionType,
          parameterFtype: FunctionType,
          writer: CodeWriter): void
    {
      assertSingleItemReceiver(receiverFtype);
      if (parameterFtype.uid() !== FunctionTypeBase.emitEmptyTuple().uid())
        { raise('parameters assumptions'); }
      forEachWord(inReverseOrder, type, (additional: number) => {
        receiverFtype.simpleEmit(writer);
        writer.
          pushInteger(accessIndex + additional*kBytesPerWord).
          addIntegers().
          loadInteger();
      });
    },
  });
}

export const ContextAttributeFactory = freeze({
  buildInitialSetter: makeBuildSetter(false),
  buildGeneralSetter: makeBuildSetter(true),
  buildReceiverGetter,
  buildGetter  
});
