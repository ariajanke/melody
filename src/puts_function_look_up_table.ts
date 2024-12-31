import { Helpers } from './helpers';
import {
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType,
} from './function_type';
import { FunctionType } from './function_type';
import { type FunctionLookUpTable } from './function_look_up_table';
import { ObjectType } from './object_type';
import { type CodeWriter } from './code_writer';
import { type WritableObjectType } from './writable_object_type';
import { StringType } from './string_type';
import { IntegerType } from './integer_type';

const { freeze, memoize } = Helpers;

export interface PutsPrinterType extends ObjectType {};

export const PutsPrinterType = freeze({
  defaultInjections: memoize(() => freeze({
    stringType: StringType.instance(),
    integerType: IntegerType.instance()
  })),
  make(mInjections = PutsPrinterType.defaultInjections()) {
    const putsLookUpTable =
      memoize(() => PutsFunctionLookUpTable.make(mInjections));
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
          return PutsPrinterType.make();
        });
      },
      sizeInBytes: () => 0
    });
  }
});

const PutsFunctionLookUpTable = freeze({
  make: (mInjections: ReturnType<typeof PutsPrinterType.defaultInjections>):
    FunctionLookUpTable =>
  {
    const { stringType, integerType } = mInjections;
    type ImplementationTable = {
      implementation: FunctionType | undefined
      [uid: symbol]: ImplementationTable
    };
    const mFunctionTypeTable: ImplementationTable = { implementation: undefined };
    function writerForType
      (objType: ObjectType, cw: CodeWriter)
    {
      const tupleMembers = objType.decompose();
      if (tupleMembers.length > 1) {
        tupleMembers.forEach((objType: ObjectType) =>
          writerForType(objType, cw));  
      } else if (objType.uid() === stringType.uid()) {
        cw.printString();
      } else if (objType.uid() === integerType.uid()) {
        cw.printInteger();
      } else {
        throw new Error(`Cannot find string for object of type: ${objType.name()}`);
      }
    }

    function makeImplementation(objTypes: Readonly<ObjectType[]>) {
      return IncompleteFunctionType.
        make().
        setParameters(ObjectType.asTuple(objTypes)).
        setReturns(ObjectType.emptyTupleInstance()).
        setContextToTakeAll().
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setName('puts').
        setBuiltin((_0: CallingContext, codeWriter: CodeWriter) => {
          objTypes.forEach((objType: ObjectType) =>
            writerForType(objType, codeWriter));
        }).
        finish();
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
        const table = lookUpImpl(mFunctionTypeTable, types);
        return table.implementation ??= makeImplementation(types);
      }
    });
  }
});
