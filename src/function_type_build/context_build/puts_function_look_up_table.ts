import { CodeWriter } from '../../code_writer';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { IntegerType } from '../integer_type';
import { FunctionTypeBase } from '../function_type_base';
import { ConstantStringType } from '../builtin_type_base';
import { TupleObjectFactory } from '../tuple_type_factory';

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

    const { emptyTuple } = TupleObjectFactory;

    const rv: FunctionType = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      parameters: () => type,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        if (receiverFtype.returns().uid() !==
            emptyTuple().uid())
        {
          raise('receiver assumptions');
        }
        if (parameterFtype.returns().uid() !== type.uid() ||
            parameterFtype.receiver().uid() !== emptyTuple().uid() ||
            parameterFtype.parameters().uid() !== emptyTuple().uid())
        {
          raise('parameter assumptions');
        }
        parameterFtype.simpleEmit(writer);
        validWritters.forEach(name => writer[name]());    

      },
    });
    return rv;
  }

  return freeze({
    // list: () =>
    //   raise(`Cannot list for "${BuiltinFunctionNames.kPuts}" functions`),
    uniqueFunctionType: (): FunctionType | undefined => undefined,
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
