import { DastBuild, DastNode, DastVisitor } from '../dast_build';
import { Helpers, StandardError } from '../helpers';

const { freeze, memoize } = Helpers;

function makeForDebug(root: DastNode): DastBuild {
  const mFrameNames: { [name: string]: true } = {};
  const { error, setErrorFn } = StandardError.make();
  const mVisitor: DastVisitor<true | undefined> = freeze({
    visitFunctionDefinition(nameMappings: DastFunctionNameMappings,
                            nodes: Readonly<DastNode[]>)
    {
      if (mFrameNames[nameMappings.name]) {
        return setErrorFn(`duplicate frame name: ${nameMappings.name}`);
      }
      mFrameNames[nameMappings.name] = true;
      nodes.forEach((n: DastNode) => n.visit(mVisitor));
      for (const pendingName in nameMappings.pendingNames) {
        if (!nameMappings.declaredNames[pendingName])
          { continue; }
        return setErrorFn(`pending name ${pendingName} is also in declared names for frame ${nameMappings.name}`);
      }
      return true;
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
      return nodes.reduce<boolean>((b: boolean, n: DastNode) => b && n.visit(mVisitor), true);
      return true;
    },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      node.visit(mVisitor);
      return true;
    }

  });
  return freeze({
    node: () => root,
    error: () => 'no error'
  });
}

export const DastValidator = freeze({ make: makeForDebug });