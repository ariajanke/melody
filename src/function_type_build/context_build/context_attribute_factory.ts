import { Helpers, raise } from '../../helpers';
import { FunctionType, ObjectType } from '../../function_type_build';
import { CodeWriter } from '../../code_writer';
import { FunctionTypeBase } from '../function_type_base';
import { WasmCompilation } from '../../wasm_compilation';
import { TupleObjectType } from '../tuple_object_type';

const { freeze, memoize } = Helpers;

const kBytesPerWord = WasmCompilation.kWordSizeInBytes;

interface ObjectSizeTraits {
  sizeInBytes(): number;
  sizeInStackItems(): number;
};

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
  varType: ObjectSizeTraits,
  fn: (offset: number) => void): void
{
  const additional = varType.sizeInBytes() % kBytesPerWord === 0 ? 0 : 1;
  const sizeInWords_ = (varType.sizeInBytes() / kBytesPerWord) + additional;
  ordering(sizeInWords_, fn);
}

function assertSingleItemReceiver(receiverFtype: FunctionType) {
  const { emptyTuple } = TupleObjectType;
  if (receiverFtype.parameters().uid() !== emptyTuple().uid() ||
      receiverFtype.receiver  ().uid() !== emptyTuple().uid() ||
      receiverFtype.returns   ().sizeInStackItems() !== 1)
  { raise('receiver assumptions'); }
}

function pushAndAdd(writer: CodeWriter, offset: number) {
  if (offset === 0)
    { return; }
  writer.pushInteger(offset).addIntegers();
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
      writer.pushStackPointer();
      pushAndAdd(writer, accessIndex);
      writer.loadInteger();
    },
  });
}

const getNonSimpleEmit = memoize(() =>
  (_0: CodeWriter) => raise('cannot simple emit an attribute ftype'));
const emptyParameterFType = memoize(() => FunctionTypeBase.emitEmptyTuple());

const getterEmissionOf = (() => {
  type EmitFunc = FunctionType['emit'];
  const sCache: { [size: number]: { [offset: number]: { emit: EmitFunc } } } = {};

  return (accessIndex: number, type: ObjectSizeTraits) => {
    return (sCache[type.sizeInBytes()] ??= {})[accessIndex] ??= freeze({
      emit(receiverFtype: FunctionType,
           _1: FunctionType,
           writer: CodeWriter)
      {
        forEachWord(inReverseOrder, type, (additional: number) => {
          receiverFtype.simpleEmit(writer);
          pushAndAdd(writer, accessIndex + additional*kBytesPerWord);
          writer.loadInteger();
        });
      }
    });
  };
})();

const setterEmissionOf = (() => {
  type EmitFunc = FunctionType['emit'];
  const sCache: { [size: number]: { [offset: number]: { emit: EmitFunc } } } = {};

  function singleItemSetter(accessIndex: number) {
    return freeze({
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter)
      {
        receiverFtype.simpleEmit(writer);
        pushAndAdd(writer, accessIndex);
        parameterFtype.simpleEmit(writer);
        writer.storeInteger();
      }
    });
  }

  function multiItemSetter(type: ObjectSizeTraits, accessIndex: number) {
    return freeze({
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter)
      {
        parameterFtype.simpleEmit(writer);

        forEachWord(inPlainOrder, type, (additional: number) => {
          receiverFtype.simpleEmit(writer);
          pushAndAdd(writer, accessIndex + additional*kBytesPerWord);
          writer.swapTopTwo().storeInteger();
        });
      }
    });
  }

  function findIt(accessIndex: number, type: ObjectSizeTraits) {
    if (type.sizeInStackItems() === 1)
      { return singleItemSetter(accessIndex); }
    return multiItemSetter(type, accessIndex);
  }

  return (accessIndex: number, type: ObjectSizeTraits) => {
    return (sCache[type.sizeInBytes()] ??= {})[accessIndex] ??= 
           findIt(accessIndex, type);
  };
})();

export interface ContextAttributeFactory {
  buildGetter(mAccessIndex: number, mType: ObjectType): FunctionType;
  buildGeneralSetter(mAccessIndex: number, mType: ObjectType): FunctionType;
  buildInitialSetter(mAccessIndex: number, mType: ObjectType): FunctionType;
}

const sInsts: { [recUid: symbol]: ContextAttributeFactory | undefined } = {};

function make(mReceiver: ObjectType): ContextAttributeFactory {
  if (sInsts[mReceiver.uid()])
    { return sInsts[mReceiver.uid()]!; }

  if (mReceiver.sizeInStackItems() > 1) {
    raise(`Cannot create factory for multi-item receiver '${mReceiver.name()}'`);
  }

  function checkReceiverAssumptions(recFtype: FunctionType) {
    assertSingleItemReceiver(recFtype);
    if (mReceiver.uid() !== recFtype.returns().uid()) {
      raise(`Given receiver '${recFtype.returns().name()}' does not match ` +
            `'${mReceiver.name()}'`);
    }
  }

  const receiver = () => mReceiver;
  const { emptyTuple } = TupleObjectType;

  function buildGetter
    (mAccessIndex: number, mType: ObjectType): FunctionType
  {
    const doGet = getterEmissionOf(mAccessIndex, mType).emit;
    return freeze({
      simpleEmit: getNonSimpleEmit(),
      uid: memoize(Symbol),
      parameters: emptyTuple,
      receiver,
      returns: () => mType,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        checkReceiverAssumptions(receiverFtype);
        if (parameterFtype.uid() !== emptyParameterFType().uid())
          { raise('parameters assumptions'); }

        doGet(receiverFtype, parameterFtype, writer);
      },
    });
  }

  function buildSetter
    (mAccessIndex: number, mType: ObjectType, mGetter?: FunctionType): FunctionType
  {
    const doSet = setterEmissionOf(mAccessIndex, mType).emit;
    const emit = (receiverFtype: FunctionType,
                  parameterFtype: FunctionType,
                  writer: CodeWriter): void =>
    {
      checkReceiverAssumptions(receiverFtype);
      if (parameterFtype.returns   ().uid() !== mType.uid() ||
          parameterFtype.receiver  ().uid() !== emptyTuple().uid() ||
          parameterFtype.parameters().uid() !== emptyTuple().uid())
      {
        raise('parameter assumptions');
      }
      
      doSet(receiverFtype, parameterFtype, writer);

      // NOTE reached by "name:=" setters
      mGetter?.emit(receiverFtype, FunctionTypeBase.emitEmptyTuple(), writer);
    };

    return freeze({
      simpleEmit: getNonSimpleEmit(),
      uid: memoize(Symbol),
      receiver,
      parameters: () => mType,
      returns: () => mGetter ? mType : emptyTuple(),
      emit
    });
  }

  function buildInitialSetter(mAccessIndex: number, mType: ObjectType) {
    return buildSetter(mAccessIndex, mType, undefined);
  }

  function buildGeneralSetter(mAccessIndex: number, mType: ObjectType) {
    return buildSetter(mAccessIndex, mType, buildGetter(mAccessIndex, mType));
  }

  return sInsts[mReceiver.uid()] ??=
    freeze({ buildGetter, buildGeneralSetter, buildInitialSetter });
}


export const ContextAttributeFactory = freeze({
  buildReceiverGetter,
  make
});
