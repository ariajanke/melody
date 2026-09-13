import { Helpers } from '../helpers';
import { Segment } from './segmentation';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import {
  IastBuild_,
  IastBuildConstructorRetrieval
} from './iast_build_constructor_retrieval';

const { freeze, memoize } = Helpers;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: IastBuildConstructorRetrieval): IastBuild_
{
  const errors = ErrorsCollector.make();
  const nodes = (() => {
    const nodes: IastNode[] = [];
    const clen = mSegment.children().length;
    for (let cidx = 0; cidx < clen; ++cidx) {
      const child = mSegment.children()[cidx];
      const ibuild = mCtorRetrieval.constructorFor(child.type())(mTokens, child, mCtorRetrieval);
      if (ibuild.node()) {
        nodes.push(ibuild.node()!);
      } else {
        errors.pushErrors(ibuild.errors());
      }
    }
    return nodes;
  });

  const node = memoize(() => {    
    nodes(); // NOTE must build first to accumulate errors
    if (errors.errors().length > 0)
      { return undefined; }

    return IastNode.makeFunctionDefinition(nodes());
  });  

  return freeze({ node, errors: errors.errors });
}

export const IastFunctionDefinitionBuild = freeze({ make });
