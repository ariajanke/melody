import { Helpers } from './helpers';
import { BuiltInFunction, CallHandlingStrategies, CallingContext, CodeWriter, IncompleteFunctionType } from './function_type';
import { FunctionType } from './function_type';
import { type FunctionLookUpTable } from './function_look_up_table';
import { ObjectType, WritableObjectType } from './object_type';
import { StackReversalLookUpTable } from './stack_reversal_type';

const { freeze, memoize } = Helpers;

export const PutsPrinterType = freeze({
  make(mOwner?: ObjectType) {
    const stackReversalTable = () => StackReversalLookUpTable.
      make(mOwner?.sizeInWords() ?? 0);
    const putsLookUpTable = memoize(() =>
      PutsFunctionLookUpTable.make(stackReversalTable()));

    return freeze({
      name: () => 'PutsPrinter',
      lookUp(operation: string): FunctionLookUpTable | undefined {
        if (operation === 'puts') {
          return putsLookUpTable();
        };
        return undefined;
      },
      forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
        fn('puts', putsLookUpTable());
      },
      uid: memoize(Symbol),
      decompose: (): Readonly<ObjectType[]> => [],
      mergeInto(obj: WritableObjectType): WritableObjectType {
        return obj.acceptMerge((_0: number) => {
          return PutsPrinterType.make(obj.objectType());
        });
      },
      sizeInWords: () => 0
    });
  }
});

const PutsFunctionLookUpTable = freeze({
  make: (mReversalLookUpTable = StackReversalLookUpTable.make(0)): FunctionLookUpTable => {
    type ImplementationTable = {
      implementation: FunctionType | undefined
      [uid: symbol]: ImplementationTable
    };
    const mTable: ImplementationTable = { implementation: undefined };

    function makePrintItem(objType: ObjectType) {
      if (objType.name() === 'String') {
        return (writer: CodeWriter) => { writer.printString(); };
      }
      return (writer: CodeWriter) => { writer.printInteger(); };
    }
    
    function makeImplementation(objTypes: Readonly<ObjectType[]>) {
      const itemPrinters  = objTypes.
        map((obj: ObjectType) => makePrintItem(obj));

      const func = mReversalLookUpTable.
        byParameters(ObjectType.asTuple(objTypes)) ?? (() => {
          throw new Error('this should not happen');
        })();

      return (callingContext: CallingContext, writer: CodeWriter): void => {
        func.onBuiltIn((bif: BuiltInFunction) => bif(callingContext, writer));
        itemPrinters.forEach((fn: (writer: CodeWriter) => void) => fn(writer));
      };
    }

    function lookUpImpl
      (tbl: ImplementationTable, params: Readonly<ObjectType[]>): ImplementationTable
    {
      params.forEach((obj: ObjectType) => {
        tbl = (tbl[obj.uid()] ??= { implementation: undefined });
      });
      return tbl;
    }

    return freeze({
      byParameters(type: ObjectType): FunctionType | undefined {
        const types = type.decompose();
        const table = lookUpImpl(mTable, types);
        return table.implementation ??= IncompleteFunctionType.
          make().
          setContextToTakeAll().
          setCallStrategy(CallHandlingStrategies.noReceiver).
          setBuiltin( makeImplementation(types) ).
          setParameters(type).
          setReturns(ObjectType.emptyTupleInstance()).
          setName('puts').
          finish();
      }
    });
  }
});
