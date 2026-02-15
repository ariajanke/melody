import { ReceiverAssignmentStripping } from '../../src/dast_build/receiver_assignment_stripping';
import { TestHelpers } from '../test_helpers';
import { DastNode_ } from '../../src/dast_build/dast_node';
import { DastCall } from '../../src/dast_build/dast_node_specializations';
import { Token } from '../../src/token';

const { describeNamed } = TestHelpers;

describeNamed({ ReceiverAssignmentStripping }, () => {
  const { makeFringe, makeInteger } = DastNode_;
  const makeCall = DastCall.make;
  describe('assignment directly on the receiver (a := 5)', () => {
    it('strips the receiver to the context', () => {
      const { interior, nameTarget } = ReceiverAssignmentStripping.
        make(makeFringe('a'));
      expect(nameTarget()).toEqual('a:=');
      const interior_ = interior();
      expect(interior_?.asString()).toEqual(Token.kContextToken.content());
    });
  });

  // TODO: table support
  xdescribe('assignment on a table (a.b := 5)', () => {
    it('strips the receiver to the context', () => {
      const call = makeCall(makeFringe('.'), makeFringe('a'), makeInteger('b'));
      const { interior, nameTarget } = ReceiverAssignmentStripping.make(call);
      expect(nameTarget()).toEqual('b:=');
      const interior_ = interior();
      expect(interior_?.asString()).toEqual('a'); 
    });
  });
});