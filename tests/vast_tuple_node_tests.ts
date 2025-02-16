import { TestHelpers } from './test_helpers';
import { StringType } from '../src/string_type';
import { ObjectType } from '../src/object_type';
import { VastTupleNode } from '../src/vast_tuple_node';
import { IntegerType } from '../src/integer_type';
import { VastIntegerLiteralNode, VastStringLiteralNode } from '../src/vast_literal_node';
import { CallingContext } from '../src/function_type';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { StringPool } from '../src/string_pool';
import { PersistentStack } from '../src/persistent_stack';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { describeNamed } = TestHelpers;

describeNamed({ VastTupleNode }, () => {
  function makeSampleTuple() {
    const intNode = VastIntegerLiteralNode.make(IntegerType.instance(), 3);
    const strNode = VastStringLiteralNode.make(StringType.instance(), 0);
    return VastTupleNode.make([intNode, strNode]);
  }
  it('as a function type returns itself', () => {
    const tuple = makeSampleTuple();
    const objTypeUids = tuple.functionType().returns().decompose().
      map((obj: ObjectType) => obj.uid());
    expect(objTypeUids).
      toEqual([IntegerType.instance().uid(), StringType.instance().uid()]);
  });
  it('will clean up after itself when needed', () => {
    const tuple = makeSampleTuple();
    const stack = PersistentStack.make<number>(() => Infinity);
    const writer = InterpretedCodeWriter.make(StringPool.makeForStrings(() => ['bees']), {
      ...InterpretedCodeWriter.defaultInjections(),
      makeStack: () => stack
    });
    tuple.functionType().builtIn()(CallingContext.canTakeNothing(), writer);
    expect(stack.count()).toEqual(0);
  });
});
