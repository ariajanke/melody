import { Helpers } from '../helpers';
import { Segment } from './segment';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import {
  IastBuild_,
  IastBuildConstructorRetrieval
} from './iast_build_constructor_retrieval';

const { freeze, memoize } = Helpers;

function make(tokens: Readonly<Token[]>, segment: Segment, mThing: IastBuildConstructorRetrieval): IastBuild_ {
  const errors = ErrorsCollector.make();
  const nodes = (() => {
    const nodes: IastNode[] = [];
    const clen = segment.children().length;
    for (let cidx = 0; cidx < clen; ++cidx) {
      const child = segment.children()[cidx];
      const ibuild = mThing.constructorFor(child.type())(tokens, child, mThing);
      if (ibuild.node()) {
        nodes.push(ibuild.node()!);
      } else {
        errors.pushErrors(ibuild.errors());
      }
    }
    return nodes;
  });

  const node = memoize(() => {
    nodes();
    if (errors.errors().length > 0)
      { return undefined; }

    return IastNode.makeFunctionDefinition(nodes());
  });

  return freeze({ node, errors: errors.errors });
}

export const IastFunctionDefinitionBuild = freeze({ make });
