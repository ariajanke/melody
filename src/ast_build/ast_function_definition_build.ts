import { Helpers } from '../helpers';
import { Segment } from './segmentation';
import { AstNode } from '../ast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import {
  AstBuild_,
  AstBuildConstructorRetrieval
} from './ast_build_constructor_retrieval';

const { freeze, memoize } = Helpers;

const { makeFunctionDefinition } = AstNode.forAstFunctionDefinitionBuild;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: AstBuildConstructorRetrieval): AstBuild_
{
  const errors = ErrorsCollector.make();
  const nodes = (() => {
    const nodes: AstNode[] = [];
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

    return makeFunctionDefinition(nodes());
  });  

  return freeze({ node, errors: errors.errors });
}

export const AstFunctionDefinitionBuild = freeze({ make });
