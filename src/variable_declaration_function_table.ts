import { type FunctionLookUpTable } from './function_look_up_table';
import { BuiltInFunction, CallHandlingStrategies, CallingContext, CodeWriter, type FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType, WritableObjectType } from './object_type';
import { MemoryArray } from './memory_array';

const { freeze, memoize } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  offset(): number
};

export interface VariableDeclaration extends ObjectType {
  mergeInto(obj: WritableObjectType): WritableObjectType
};

export const VariableDeclaration = freeze({
  make(name: string, varType: ObjectType, operator: string, offset: number = 0): VariableDeclaration {
    const lookUpTable = memoize(() => VariableDeclarationFunctionTable.
      make(varType, operator, offset));

    const inst = freeze({
      name: () => '<context>.Let(Integer)',
      lookUp(operation: string): FunctionLookUpTable | undefined {
        if (operation === name) {
          return lookUpTable();
        }
        return undefined;
      },
      forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
        fn(name, lookUpTable());
      },
      uid: memoize(Symbol),
      decompose: memoize((): ObjectType[] => [inst]),
      mergeInto(obj: WritableObjectType) {
        // I need to know by how much to adjust my offset
        return obj.acceptMerge((currentOffset: number) => {
          return VariableDeclaration.
            make(`.${name}`, varType, operator, currentOffset);
        });
      },
      sizeInWords: () => 1, // size of integer by definition

    });
    return inst;
  }
});

export const VariableDeclarationFunctionTable = freeze({
  pushCurrentMemoryPosition(writer: CodeWriter, offset: number): CodeWriter {
    return writer.
      pushInteger(MemoryArray.stackPointerLocation()).
      loadInteger().
      pushInteger(offset).
      addIntegers();
  },
  make(varType: ObjectType, operator: string, memoryOffset: number) {
    const { noReceiver } = CallHandlingStrategies;
    const { uid } = varType;
    const mGetter = IncompleteFunctionType.
      make().
      setCallStrategy(noReceiver).
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(varType).
      setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
      {
        if (!callingContext.canTake(varType)) {
          return;
        }
        VariableDeclarationFunctionTable.
          pushCurrentMemoryPosition(writer, memoryOffset).
          loadInteger();
      }).
      finish();
    // still need setter (once though) for the "=" case
    // does the actual store
    const mSetter = (() => {
      if (operator !== ':=')
        { return undefined; }
      return IncompleteFunctionType.
        make().
        setCallStrategy(noReceiver).
        setParameters(varType).
        setReturns(varType).
        setContextToTakeAll().
        setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
        {
          // top of stack contains value to save
          // we only know the offset here
          // WASM requires that the value to save be at the top
          // - stack flip with a local
          // - go all the way back on instructions until you hit the beginning (nah)
          
          VariableDeclarationFunctionTable.
            pushCurrentMemoryPosition(writer, memoryOffset).
            swapTopTwo().
            storeInteger();
          mGetter.onBuiltIn((bif: BuiltInFunction) => { bif(callingContext, writer); });
        }).
        finish();
      })();
    return freeze({
      offset: () => memoryOffset,
      byParameters(param: ObjectType): FunctionType | undefined {
        const params = param.decompose();
        if (params.length === 0) {
          return mGetter;
        } else if (params[0].uid() === uid()) {
          return mSetter;
        }
        return undefined;
      },
      variableType: varType
    }) satisfies VariableDeclarationFunctionTable;
  }
});
