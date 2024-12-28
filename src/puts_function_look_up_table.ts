import { Helpers } from './helpers';
import {
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType,
} from './function_type';
import { FunctionType } from './function_type';
import { type FunctionLookUpTable } from './function_look_up_table';
import { ObjectType, WritableObjectType } from './object_type';
import { type CodeWriter, PrintCodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

export const PutsPrinterType = freeze({
  make() {
    const putsLookUpTable = memoize(PutsFunctionLookUpTable.make);
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
      sizeInWords: () => 0
    });
  }
});

const PutsFunctionLookUpTable = freeze({
  make: (): FunctionLookUpTable => {
    type ImplementationTable = {
      implementation: FunctionType | undefined
      [uid: symbol]: ImplementationTable
    };
    const mTable: ImplementationTable = { implementation: undefined };

    function makeImplementation(objTypes: Readonly<ObjectType[]>) {
      return IncompleteFunctionType.
        make().
        setParameters(ObjectType.asTuple(objTypes)).
        setReturns(ObjectType.emptyTupleInstance()).
        setContextToTakeAll().
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setName('puts').
        setBuiltin((_0: CallingContext, codeWriter: CodeWriter) => {
          codeWriter.forPrintMethod((cwp: PrintCodeWriter) => {
            objTypes.forEach((objType: ObjectType) => {
              if (objType.name() === 'String')
                { cwp.printString(); }
              else
                { cwp.printInteger(); }
            });
          });
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
        const table = lookUpImpl(mTable, types);
        return table.implementation ??= makeImplementation(types);
      }
    });
  }
});
