import {
  DastBuild,
  DastLetDeclation,
  DastNode,
  MergeableDastBuild
} from '../dast_build';
import { Helpers } from '../helpers';
import { IastNode, IastVisitor } from '../iast_node';
import { LetDeclarationsRetrieval, LetNameElement } from './let_declarations_retrieval';
import { DastBuildBase } from './dast_build_base';
import { DastCallBuild } from './dast_call_build';
import { DastNode_ } from './dast_node';

const { freeze } = Helpers;

function makeVisitFringe(fn: (v: string) => DastNode) {
  return (v: string) => DastBuildBase.makeFromNode(fn(v));
}

const visitString = makeVisitFringe(DastNode_.makeString);

const visitInteger = makeVisitFringe(DastNode_.makeInteger);

const visitFringe = makeVisitFringe(DastNode_.makeFringe);

function make() {
  const mDefinitionStack: DastLetDeclation[][] = [];

  function visitLet(innerNode: IastNode) {
    const retr = LetDeclarationsRetrieval.make(innerNode, (node: IastNode) => node.visit(inst));

    const { elements, dastNode } = retr;
    if (!elements() || !dastNode()) {
      return DastBuildBase.makeFailed(retr.error);
    }
    const topDefs = mDefinitionStack[ mDefinitionStack.length - 1 ];

    elements()!.forEach((element: LetNameElement) => {
      topDefs.push(element);
    });

    return DastBuildBase.makeFromNode(dastNode()!);
  }

  function visitTuple(nodes: Readonly<IastNode[]>): DastBuild {
    return nodes.
      map(v => v.visit(inst)).
      reduce((prev: MergeableDastBuild, cur: DastBuild): MergeableDastBuild =>
        prev.mergeWith(cur),
        DastBuildBase.startTuple());
  }

  function visitCall(callName: IastNode, receiver: IastNode, args: IastNode):
    DastBuild
  {
    return DastCallBuild.
      make(callName.visit(inst),
           receiver.visit(inst),
           args.visit(inst));
  }

  function visitFunctionDefinition(nodes: Readonly<IastNode[]>): DastBuild {
    // v something funky going on with defs
    mDefinitionStack.push([]);
    
    const defsStart = DastBuildBase.startDefinition(() => {
      const res = mDefinitionStack.pop();
      if (res) return res;
      throw new Error('stack corrupted');
    });

    return nodes.
      map(v => v.visit(inst)).
      reduce((prev: MergeableDastBuild, something: DastBuild) =>
        prev.mergeWith(something),
        defsStart);
  }

  const inst: IastVisitor<DastBuild> = freeze({
    visitLet,
    visitString,
    visitInteger,
    visitFringe,
    visitTuple,
    visitCall,
    visitFunctionDefinition
  });
  return inst;
}

export const DastBuildVisitor = freeze({ make });
