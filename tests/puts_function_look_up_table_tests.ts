import { StringPool } from '../src/context_type';
import { type BuiltInFunction, type FunctionType } from '../src/function_type';
import { MemoryArray } from '../src/memory_array';
import { PersistentStack } from '../src/persistent_stack';
import { PutsFunctionLookUpTable } from '../src/puts_function_look_up_table';
import { StringType } from '../src/string_type';
import { TestHelpers } from './test_helpers';

const { describeNamed } = TestHelpers

describeNamed({ PutsFunctionLookUpTable }, () => {
  const stringType = StringType.instance();

  it('prints strings in order', () => {
    const strings: string[] = [];
    const putsLookUp = PutsFunctionLookUpTable.
      make(StringPool.makeForStrings(() => ['hello', 'mario']),
           (str: string) => strings.push(str));
    const stack = PersistentStack.make<number>(() => Infinity);
    stack.push(0);
    stack.push(1);

    (putsLookUp.
      byParameters([stringType, stringType]) as FunctionType).
      onBuiltIn((bif: BuiltInFunction) => {
        bif(stack, MemoryArray.make());
      });
    expect(strings).toEqual(['hello', 'mario'])
  });

  it('can print only one string', () => {
    const strings: string[] = [];
    const putsLookUp = PutsFunctionLookUpTable.
      make(StringPool.makeForStrings(() => ['hello', 'mario']),
           (str: string) => strings.push(str));
    const stack = PersistentStack.make<number>(() => Infinity);
    stack.push(1);

    (putsLookUp.
      byParameters([stringType]) as FunctionType).
      onBuiltIn((bif: BuiltInFunction) => {
        bif(stack, MemoryArray.make());
      });
    expect(strings).toEqual(['mario']);
  });
});
