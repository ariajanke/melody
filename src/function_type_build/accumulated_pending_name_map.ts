import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers } from '../helpers';
type WritableNamesSet = { [name: string]: true };
type NamesSet = Readonly<WritableNamesSet>;
export type AccumulatedPendingNameMap =
  (node: DastNode) => NamesSet;

const { freeze } = Helpers;

type NameCache = { [uid: number]: NamesSet | undefined };

function make(root: DastNode) {
  const mCache: NameCache = {};
  function makeVisitor(accumulatingSet: WritableNamesSet) {
    function mergeInto(other: NamesSet) {
      Object.keys(other).forEach(name => accumulatingSet[name] = true);
    }
    const visitor = freeze({
      visitFringe: (_0: string) => undefined,
      visitString: (_0: string) => undefined,
      visitInteger: (_0: string) => undefined,
      visitFunctionDefinition: (defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>) => {
        nodes.forEach((node: DastNode) => {
          mergeInto(doMapping(node));
        });
        mergeInto(defs.pendingNames);
      },
      visitInitialSet(_0: readonly string[] | string, node: DastNode) {
        node.visit(visitor);
      },
      visitTuple(nodes: Readonly<DastNode[]>) {
        nodes.forEach(node => node.visit(visitor));
      },
      visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
        callName.visit(visitor);
        receiver.visit(visitor);
        args.visit(visitor);
      }
    });
    return visitor;
  }
  const doMapping = (node: DastNode): NamesSet => {
    const uid = node.uid();
    if (mCache[uid])
      { return mCache[uid]; }
    const ontoSet: WritableNamesSet = {};
    node.visit(makeVisitor(ontoSet));
    mCache[uid] = freeze(ontoSet);
    return mCache[uid] as NamesSet;
  };
  doMapping(root);
  return doMapping;
}

export const AccumulatedPendingNameMap = freeze({ make });
