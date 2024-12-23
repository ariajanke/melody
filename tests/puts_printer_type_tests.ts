import { CallingContext, type BuiltInFunction, type FunctionType } from '../src/function_type';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { PersistentStack } from '../src/persistent_stack';
import { StringType } from '../src/string_type';
import { TestHelpers } from './test_helpers';
import { PutsPrinterType } from '../src/puts_function_look_up_table';
import { StringPool } from '../src/string_pool';
import { ObjectType } from '../src/object_type';

const { describeNamed } = TestHelpers;

describeNamed({ PutsPrinterType }, () => {
  const stringType = StringType.instance();
  
  function makeStuff() {
    const strings: string[] = [];
    const stack = PersistentStack.make<number>(() => Infinity);
    const icw = InterpretedCodeWriter.
      make( StringPool.makeForStrings(() => ['hello', 'mario'] ), {
        ...InterpretedCodeWriter.defaultInjections(),
        putsFunction: (str: string) => strings.push(str),
        makeStack: () => stack
      });
    return {
      strings, stack, icw
    };
  }
  it('prints strings in order', () => {
    const { stack, strings, icw } = makeStuff();
    
    const printer = PutsPrinterType.make();
    stack.push(0);
    stack.push(1);

    (printer.
      lookUp('puts')?.
      byParameters(ObjectType.asTuple([stringType, stringType])) as FunctionType
    ).onBuiltIn((bif: BuiltInFunction) => {
        bif(CallingContext.canTakeAll(), icw);
      });
    expect(strings).toEqual(['hello', 'mario']);
  });

  it('can print only one string', () => {
    const { stack, strings, icw } = makeStuff();
    const printer = PutsPrinterType.make();
    stack.push(1);

    (printer.lookUp('puts')?.
      byParameters(stringType) as FunctionType).
      onBuiltIn((bif: BuiltInFunction) => {
        bif(CallingContext.canTakeAll(), icw);
      });
    expect(strings).toEqual(['mario']);
  });
});
