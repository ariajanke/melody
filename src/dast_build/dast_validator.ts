import { DastBuild, DastFunctionNameMappings, DastNode, DastVisitor } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, StandardError, raise } from '../helpers';

const { freeze, memoize } = Helpers;

const PendingNameValidation = freeze({
  make(root: DastNode): DastBuild {
    const mExplorationStack: DastFunctionNameMappings[] = [];
    const { error, setErrorMessage } = StandardError.make();
    function isPendingNameValid(name: string): boolean {
      if (name === FunctionNamingSchema.kParentName)
        { return true; }

      for (let i = mExplorationStack.length - 1; i >= 0; i--) {
        const frame = mExplorationStack[i];
        if (frame.declaredNames[name]) {
          return true;
        }
        if (!frame.pendingNames[FunctionNamingSchema.kParentName]) {
          setErrorMessage(`for pending name "${name}", must have "<parent>" as a pending name in frame "${frame.name}"`);
          return false;
        }
      }
      setErrorMessage(`pending name "${name}" is not declared in any frame`);
      return false;
    }

    function visitFunctionDefinition
      (nameMappings: DastFunctionNameMappings,
       nodes: Readonly<DastNode[]>)
    {
      if (nameMappings.pendingNames[FunctionNamingSchema.kParentName] &&
          Object.keys(nameMappings.pendingNames).length === 1
      ) {
        setErrorMessage(`"<parent>" cannot be the only pending name for frame ${nameMappings.name}`);
        return false;
      }

      for (const name in nameMappings.pendingNames) {
        if (!isPendingNameValid(name))
          { return false; }
      }
      
      mExplorationStack.push(nameMappings);
      const constituateNodesOkay = nodes.every(n => n.visit(mVisitor));
      mExplorationStack.pop();
      return constituateNodesOkay;
    }

    const mVisitor: DastVisitor<boolean> = freeze({
      ...makeVisitorCommon(() => mVisitor),
      visitFunctionDefinition,
    });

    return freeze({
      node: memoize(() => root.visit(mVisitor) ? root : undefined),
      error
    });
  }
});

function makeVisitorCommon(getInst: () => DastVisitor<boolean>): DastVisitor<boolean> {
  return freeze({
    visitFunctionDefinition(_0: DastFunctionNameMappings,
                            _1: Readonly<DastNode[]>)
    { raise('Must implement "visitFunctionDefinition"'); },
    visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
      const inst = getInst();
      return callName.visit(inst) &&
             receiver.visit(inst) &&
             args.visit(inst);
    },
    visitFringe() { return true; },
    visitInteger() { return true; },
    visitString() { return true; },
    visitTuple(nodes: Readonly<DastNode[]>) {
      const inst = getInst();
      return nodes.every(n => n.visit(inst));
    },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      const inst = getInst();
      return node.visit(inst);
    }
  });
}

function makeForDebug(root: DastNode): DastBuild {
  const mFrameNames: { [name: string]: true } = {};
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  const mValidation = PendingNameValidation.make(root);
  const mVisitor: DastVisitor<boolean> = freeze({
    ...makeVisitorCommon(() => mVisitor),
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
    }
  });

  const validatedNode = (() =>
    mValidation.node() ?? setErrorFn(mValidation.error));

  return freeze({
    node: memoize(() => root.visit(mVisitor) && validatedNode() ? root : undefined),
    error
  });
}

export const DastValidator = freeze({ make: makeForDebug });
