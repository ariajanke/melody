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

  // confirm if an IAST with "(a)" is even possible
  // describe('assignment single member tuple ( (a) := ... )', () => {
  //   it('strips the receiver to the context', () => {
  //     const { strippedTree, nameTarget } = ReceiverAssignmentStripping.
  //       make(IastNode.forAssignmentStripping.makeTuple(makeFringe('a')));
  //     expect(nameTarget()?.content()).toEqual('a');
  //     expect(strippedTree()?.asString()).toEqual(kContextToken.content());
  //   });
  // });

  describe(`assignment on a deeper table (a.foo(3, 'beans').b := 5)`, () => {

    
    it('strips the receiver to the context', () => {
      // const fooArgs = tuplify(makeFringe('3'), makeFringe(`'beans'`));
      // makeCall('foo', )
      // makeCall('.', )
      // fail();  
    });
  });

  describe('errors out on a multi-item tuple', () => {
    it('does not produce a stripped tree', fail);
    it('does not produce a name token', fail);
    it('has an appropriate error message', fail);
  });
});