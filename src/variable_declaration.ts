import { CodeWriter } from './code_writer';
import { FunctionLookUpTable } from './function_look_up_table';
import { CallingContext, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VariableDeclarationFunctionTable } from './variable_declaration_function_table';
import { VastNode } from './vast_node';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

type DeclarationDetails = Readonly<{
  valueNode: VastNode,
  operator: string,
  name: string,
  tuplePosition: number | undefined
}>;

export interface VariableDeclaration extends ObjectType {
  mergeInto(obj: WritableObjectType): WritableObjectType
};

const TuplePositionBreakdown = freeze({
  make(mVarType: ObjectType, position: number | undefined) {
    const inst = freeze({
      resultantType: memoize(() => {
        if (position === undefined)
          { return mVarType; }
        return mVarType.decompose()[position] ?? (() => {
          throw new Error(`Tuple position ${position} does not exist in ${mVarType.name()}`);
        })();
      }),
    });
    return inst;
  }
});

const VariableAsFunctionDeclaration = freeze({
  emptyTable:
    memoize((): { [name: string]: () => FunctionLookUpTable } => freeze({})),
  make(mName: string, mGetLookup: () => FunctionLookUpTable, mType: () => ObjectType) {
    const { emptyTupleInstance } = ObjectType;
    const mGetter = memoize(() => mGetLookup().byParameters(emptyTupleInstance()) ?? (() => {
      throw new Error('Variable declaration must at least declare a getter');
    })());
    const callFunc = () => IncompleteFunctionType.
      make().
      // depends on signature
      setParameters(emptyTupleInstance()).
      setReturns(emptyTupleInstance()).
      setName(mName).
      setBuiltin((_0: CallingContext, cw: CodeWriter) => {
        mGetter().builtIn()(CallingContext.canTakeAll(), cw);
        // depends on signature
        cw.indirectCall(0);
      }).  
      finish();
    const callLookUp =
      memoize(() => FunctionLookUpTable.makeSingleLookUp(callFunc()));
    return freeze({
      table: memoize((): { [name: string]: () => FunctionLookUpTable } => {
        if (mType().name() === 'Function')
          { return freeze({ [mName]: callLookUp }); }
        return VariableAsFunctionDeclaration.emptyTable();
      })
    });
  }
});

export const VariableDeclaration = freeze({
  make(mElement: DeclarationDetails, mOffset: number = 0): VariableDeclaration {
    const { resultantType } = TuplePositionBreakdown.
      make(mElement.valueNode.functionType().returns(), mElement.tuplePosition);
    const lookUpTable = memoize(() => VariableDeclarationFunctionTable.
      make(resultantType(),
           mElement.operator,
           mElement.valueNode,
           mOffset));
    const mLookUpMap = freeze({
      [`.${mElement.name}`]: lookUpTable,
      ...VariableAsFunctionDeclaration.
        make(mElement.name, lookUpTable, resultantType).
        table()
    });
    const inst = freeze({
      name: () => `<context>.Let(${resultantType().name()})`,
      lookUp(operation: string): FunctionLookUpTable | undefined {
        return (mLookUpMap[operation] ?? (() => undefined))();
      },
      forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
        Object.keys(mLookUpMap).forEach((name: string) => {
          fn(name, mLookUpMap[name]());
        });
      },
      uid: memoize(Symbol),
      decompose: memoize((): ObjectType[] => [inst]),
      mergeInto(obj: WritableObjectType) {
        return obj.acceptMerge((currentOffset: number) => {
          return VariableDeclaration.make(mElement, currentOffset);
        });
      },
      sizeInBytes: () => resultantType().sizeInBytes(),
    });
    return inst;
  }
});
