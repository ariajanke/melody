import { TestHelpers } from './test_helpers';
import { VastIntegerLiteralNode } from '../src/vast_literal_node';
import { IntegerType } from '../src/integer_type';
import { ObjectType } from '../src/object_type';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { describeNamed } = TestHelpers;

describeNamed({ VastIntegerLiteralNode }, () => {
  it('is its (declared) type', () => {
    const node = VastIntegerLiteralNode.make(IntegerType.instance(), 3);
    expect(node.functionType().returns().uid()).
      toEqual(IntegerType.instance().uid());
  });

  it('is the expected function type', () => {
    const node = VastIntegerLiteralNode.make(IntegerType.instance(), 3);
    expect(node.functionType().parameters().uid()).
      toEqual(ObjectType.emptyTupleInstance().uid());
    expect(node.functionType().returns().uid()).
      toEqual(IntegerType.instance().uid());
  });
});
