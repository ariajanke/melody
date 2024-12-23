import { FunctionLookUpTable } from './function_look_up_table';
import {
  CallHandlingStrategies,
  CallingContext,
  CodeWriter,
  FunctionType,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType, WritableObjectType } from './object_type';
import { VariableDeclarationFunctionTable } from './variable_declaration_function_table';

const { freeze, memoize } = Helpers;

const kFunctionName = '__reverse_stack';

// our first variable sized thing
// which will make our context vulnerable
// it, and other "makes use of temporary space" objects
// will need to merged in last

export const StackReversalLookUpTable = freeze({
  make(mOffset: number): FunctionLookUpTable {
    const functionType = (numberOfItems: number) =>
      IncompleteFunctionType.
        make().
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setName(kFunctionName).
        setParameters(ObjectType.emptyTupleInstance()).
        setReturns(ObjectType.emptyTupleInstance()).
        setBuiltin((_0: CallingContext, codeWriter: CodeWriter) => {
          if (numberOfItems === 1) return;
          const end = mOffset + numberOfItems;
          for (let i = mOffset; i < end; ++i) {
            pushCurrentMemoryPosition(codeWriter, i).
              swapTopTwo().
              storeInteger();
          }
          for (let i = mOffset; i < end; ++i) {
            pushCurrentMemoryPosition(codeWriter, i).
              loadInteger();
          }
        }).
        finish();

    const mFunctionTypes: FunctionType[] = [];

    return freeze({
      byParameters(type: ObjectType): FunctionType | undefined {
        const types = type.decompose();
        return mFunctionTypes[types.length] ??= functionType(types.length);
      }
    });
  }
});

export interface StackReversalType extends ObjectType {
  mergeInto(obj: WritableObjectType): WritableObjectType
};

const { pushCurrentMemoryPosition } = VariableDeclarationFunctionTable;

function construct(mOffset?: number): StackReversalType {
  mOffset ??= 0;
  const functionLookUpTable =
    memoize(() => StackReversalLookUpTable.make(mOffset));

  return freeze({
    name: () => 'StackReversal',
    lookUp(operation: string): FunctionLookUpTable | undefined {
      if (operation === kFunctionName) {
        return functionLookUpTable();
      };
      return undefined;
    },
    forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
      fn(kFunctionName, functionLookUpTable());
    },
    uid: memoize(Symbol),
    decompose: (): Readonly<ObjectType[]> => [],
    mergeInto(obj: WritableObjectType): WritableObjectType {
      return obj.acceptMerge((currentOffset: number) => {
        return construct(currentOffset);
      });
    },
    sizeInWords: () => 0
  });
}

export const StackReversalType = freeze({
  functionName: () => kFunctionName,
  make: construct
});
