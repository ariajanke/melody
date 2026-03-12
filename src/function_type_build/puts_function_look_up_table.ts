import { BuiltinFunctionNames } from '../builtin_function_names';
import { CodeWriter } from '../code_writer';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { ConstantStringType, IntegerType } from './builtin_type';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

// TODO accept nested tuples
function make(): FunctionLookUpTable {
  const mIntegerType = IntegerType.instance();
  const mStringType = ConstantStringType.instance();

  const kCodeWriterFuncNames =
    ['printInteger', 'printString'] as const satisfies (keyof CodeWriter)[];

  type CodeWriterFuncName = typeof kCodeWriterFuncNames[number];

  type MappingEntry = FunctionType | 'notSupported' | undefined;
  
  const mParameterMapping: { [uid: symbol]: MappingEntry } = {};

  function makePutsFunctionFor(type: ObjectType): MappingEntry {
    const detuped = type.detuplify();
    const reverseTypes = (detuped ? [...detuped] : [type]);
    const writters: (CodeWriterFuncName | undefined)[] =
      reverseTypes.map((t: ObjectType) =>
      {
        if (t.uid() === mIntegerType.uid()) {
          return 'printInteger';
        } else if (t.uid() === mStringType.uid()) {
          return 'printString';
        }
        return undefined;
      });

    const allTypesSupported = writters.every((writter) => writter);
    if (!allTypesSupported) {
      return 'notSupported';
    }
    const validWritters = writters as readonly CodeWriterFuncName[];

    return freeze({
      ...FunctionTypeBase.receivedByNone(),
      parameters: () => type,
      emit(writer: CodeWriter) {
        validWritters.forEach(name => writer[name]());
        // no longer needed, because of the actual receiver changed to none
        // writer.drop();
        return writer;
      }
    });
  }

  return freeze({
    list: () =>
      raise(`Cannot list for "${BuiltinFunctionNames.kPuts}" functions`),
    byParameters(type: ObjectType): FunctionType | undefined {
      const found =
        mParameterMapping[type.uid()] ??=
        makePutsFunctionFor(type);
      if (found === 'notSupported')
        { return undefined; }
      return found;
    }
  });
}

export const PutsFunctionLookUpTable = freeze({ make, instance: memoize(make) });
