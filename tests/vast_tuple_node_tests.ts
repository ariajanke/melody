import { TestHelpers } from './test_helpers';
import { StringType } from '../src/string_type';
import { ObjectType } from '../src/object_type';
import { VastTupleNode } from '../src/vast_tuple_node';
import { IntegerType } from '../src/integer_type';
import { VastIntegerLiteralNode, VastStringLiteralNode } from '../src/vast_literal_node';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { describeNamed } = TestHelpers;

describeNamed({ VastTupleNode }, () => {
  it('as a function type returns itself', () => {
    const intNode = VastIntegerLiteralNode.make(IntegerType.instance(), 3);
    const strNode = VastStringLiteralNode.make(StringType.instance(), 0);
    const tuple = VastTupleNode.make([intNode, strNode]);
    const objTypeUids = tuple.functionType().returns().decompose().
      map((obj: ObjectType) => obj.uid());
    expect(objTypeUids).
      toEqual([IntegerType.instance().uid(), StringType.instance().uid()]);
  });
  it('as an object, is itself', () => {
    const intNode = VastIntegerLiteralNode.make(IntegerType.instance(), 3);
    const strNode = VastStringLiteralNode.make(StringType.instance(), 0);
    const tuple = VastTupleNode.make([intNode, strNode]);
    const objTypeUids = tuple.objectType().decompose().
      map((obj: ObjectType) => obj.uid());
    expect(objTypeUids).
      toEqual([IntegerType.instance().uid(), StringType.instance().uid()]);
  });
});
