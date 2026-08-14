import { ReceiverAssignmentStripping } from '../../src/dast_build/receiver_assignment_stripping';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { IastNode } from '../../src/iast_node';
import { TestHelpers } from '../test_helpers';
import { TokenFactories } from '../token_factories';

const { describeNamed } = TestHelpers;

describeNamed({ ReceiverAssignmentStripping }, () => {
  const makeToken = TokenFactories.makeFromStringOnly;
  const makeFringe = (v: string) => IastNode.makeFringe( makeToken(v) );
  const makeCall = (v: string, rec: IastNode, args: IastNode) =>
    IastNode.forAssignmentStripping.makeCall(makeToken(v), rec, args);

  describe('assignment directly on the receiver (a := 5)', () => {
    it('strips the receiver to the context', () => {
      const { strippedTree, nameTarget } = ReceiverAssignmentStripping.
        make(makeFringe('a'));

        expect(nameTarget()?.content()).toEqual('a');
      const interior_ = strippedTree();
      expect(interior_?.asString()).toEqual(FunctionNamingSchema.kContextName);
    });
  });

  describe('assignment on a table (a.b := 5)', () => {
    it('strips the receiver to the context', () => {
      const rec = makeFringe('a');
      const call = makeCall('.', rec, makeFringe('b'));
      const { strippedTree, nameTarget } = ReceiverAssignmentStripping.make(call);
      expect(nameTarget()?.content()).toEqual('b');
      expect(strippedTree()?.asString()).toEqual('a'); 
    });
  });

  describe('assignment single member tuple ( (a) := ... )', () => {
    it('strips the receiver to the context', () => {
      fail();
    });
  });

  describe(`assignment on a deeper table (a.foo(3, 'beans').b := 5)`, () => {
    it('strips the receiver to the context', () => {
      fail();
    });
  });  
});