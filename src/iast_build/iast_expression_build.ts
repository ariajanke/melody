import { Helpers, raise } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { AstExpressionCollector } from './iast_expression_build/ast_expression_collector';
import { ErrorsCollector } from './errors_collector';
import {
  IastBuild_,
  IastBuildConstructorRetrieval
} from './iast_build_constructor_retrieval';
import { Segment } from './segmentation';

const { freeze, memoize } = Helpers;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetreival: IastBuildConstructorRetrieval)
  : IastBuild_
{
  if (mSegment.type() !== 'expression')
    { raise('segment must be an expression'); }
  if (!Segment.hasValidIndices(mSegment))
    { raise('segment must be valid'); }

  const mErrors = ErrorsCollector.make();
  const collector = () => {
    const collector_ = AstExpressionCollector.make();
    let cidx = 0;
    for (let idx = mSegment.start(); idx < mSegment.end(); ) {
      if (mTokens[idx] === undefined)
        { raise('went too far?!'); }
      const child = mSegment.children()[cidx];
      if (idx === child?.start()) {
        const ibuild = mCtorRetreival.constructorFor(child.type())(mTokens, child, mCtorRetreival);
        const node = ibuild.node();
        if (node) {
          collector_.pushNode(node);
        } else {
          mErrors.pushErrors(ibuild.errors());
        }

        idx = child.end();
        ++cidx;
      } else {
        const token = mTokens[idx];
        if (token.type() === Token.types.operator) {
          collector_.pushOperator(token);
        } else if (Segment.isFringe(token)) {
          const node = IastNode.makeFringe(token);
          collector_.pushNode(node);
        }
        // NOTE tolerate and ignore any groupings
        ++idx;
      }
    }
    return collector_;
  };

  const node = memoize(() => {
    
    if (mErrors.errors().length > 0)
      { return undefined; }

    const ibuild = collector().finish();
    if (!ibuild.node()) {
      mErrors.pushError(ibuild.error());
      return undefined;
    }

    return ibuild.node();
  });

  return freeze({
    node,
    errors: mErrors.errors
  });
}

export const IastExpressionBuild = freeze({ make });
