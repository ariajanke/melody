import { DastBuild, DastFunctionNameMappings, DastNode, DastVisitor } from '../dast_build';
import { Helpers, StandardError } from '../helpers';

const { freeze, memoize } = Helpers;

function makeForDebug(root: DastNode): DastBuild {
  const mFrameNames: { [name: string]: true } = {};
  const { error, setErrorMessage } = StandardError.make();
  const mVisitor: DastVisitor<boolean> = freeze({
    visitFunctionDefinition(nameMappings: DastFunctionNameMappings,
                            nodes: Readonly<DastNode[]>)
    {
      if (mFrameNames[nameMappings.name]) {
        setErrorMessage(`duplicate frame name: ${nameMappings.name}`);
        return false;
      }
      mFrameNames[nameMappings.name] = true;
      for (const pendingName in nameMappings.pendingNames) {
        if (!nameMappings.declaredNames[pendingName])
          { continue; }
        setErrorMessage(`pending name ${pendingName} is also in declared names for frame ${nameMappings.name}`);
        return false;
      }
      return nodes.every(n => n.visit(mVisitor));
    },
    visitCall(callName: DastNode, receiver: DastNode, args: DastNode) { 
      return callName.visit(mVisitor) &&
             receiver.visit(mVisitor) &&
             args.visit(mVisitor);
    },
    visitFringe() { return true; },
    visitInteger() { return true; },
    visitString() { return true; },
    visitTuple(nodes: Readonly<DastNode[]>) {
      return nodes.every(n => n.visit(mVisitor));
    },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      return node.visit(mVisitor);
    }

  });
  return freeze({
    node: memoize(() => root.visit(mVisitor) ? root : undefined),
    error
  });
}

export const DastValidator = freeze({ make: makeForDebug });
