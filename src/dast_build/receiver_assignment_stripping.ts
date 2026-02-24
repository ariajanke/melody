import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { Token } from '../token';
import { DastNode_ } from './dast_node';
import type { DastVisitor_ } from './dast_visitor';

const { freeze, memoize } = Helpers;

export interface ReceiverAssignmentStripping {
  nameTarget(): string | undefined;
  interior(): DastNode | undefined;
  error(): StandardErrorMessage
};

export const ReceiverAssignmentStripping = freeze({
  make(mReceiver: DastNode): ReceiverAssignmentStripping {
    const { error, setErrorMessage } = StandardError.make();
    const mVisitOtherFringe = (v: string) =>
      setErrorMessage(`Invalid assignment target (${v})`);
    let mNameTarget: string | undefined = undefined;
    const mVisitor: DastVisitor_ = freeze({
      visitString: mVisitOtherFringe,
      visitInteger: mVisitOtherFringe,
      visitFringe(v: string) {
        mNameTarget = FunctionNamingSchema.mapToAssignment(v);
      },
      visitTuple(_0: Readonly<DastNode[]>)
        { setErrorMessage(`Invalid assignment tuple target`); },
      visitCall(_0: DastNode, _1: DastNode, _2: DastNode)
        { setErrorMessage(`Invalid assignment call target`); },
      visitInitialSet(_0: readonly string[] | string, _1: DastNode)
        { setErrorMessage(`Invalid assignment initial set target`); },
      visitFunctionDefinition(_0: DastFunctionNameMappings, _1: Readonly<DastNode[]>)
        { setErrorMessage(`Invalid assignment function definition target`); }
    });

    const inst = freeze({
      nameTarget: memoize((): string | undefined =>
        mReceiver.visit(mVisitor) ?? mNameTarget),
      interior: memoize((): DastNode | undefined => {
        if (!inst.nameTarget()) return undefined;

        return DastNode_.makeFringe(Token.kContextToken.content());
      }),
      error
    });
    return inst;
  }
});
