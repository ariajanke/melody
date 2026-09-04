import { Helpers, raise, StandardErrorMessage } from './helpers';
import { AstExpressionCollector } from './iast_build/ast_expression_collector';
import { FunctionBodySegmentation } from './iast_build/function_body_segmentation';
import { Segment, SegmentType } from './iast_build/segment';
import { IastNode } from './iast_node';
import { Token } from './token';

const { freeze, memoize } = Helpers;

export interface IastBuild {
  node(): IastNode | undefined;
  errors(): Readonly<StandardErrorMessage[]>;
};

type SegmentProcessor = (tokens: Readonly<Token[]>, segment: Segment) => IastBuild;

const strats: Readonly<{ [st in SegmentType]: SegmentProcessor }> = freeze({
  functionDefinitionBody: forFunctionDefinitionBody,
  expression: forExpression
});

interface ErrorsCollector {
  pushErrors(errors: Readonly<StandardErrorMessage[]>): void;
  pushError(error: StandardErrorMessage): void;
  errors(): Readonly<StandardErrorMessage[]>;
};

const ErrorsCollector = freeze({
  make() {
    const mErrors: StandardErrorMessage[] = [];
    return freeze({
      pushErrors(errors: Readonly<StandardErrorMessage[]>)
        { mErrors.push(...errors); },
      pushError(error: StandardErrorMessage)
        { mErrors.push(error); },
      errors(): Readonly<StandardErrorMessage[]>
        { return mErrors; }
    });
  }
});

function forFunctionDefinitionBody
  (tokens: Readonly<Token[]>, segment: Segment): IastBuild
{
  const errors = ErrorsCollector.make();
  const nodes: IastNode[] = [];
  const clen = segment.children().length;
  for (let cidx = 0; cidx < clen; ++cidx) {
    const child = segment.children()[cidx];
    const ibuild = strats[child.type()](tokens, child);
    if (ibuild.node()) {
      nodes.push(ibuild.node()!);
    } else {
      errors.pushErrors(ibuild.errors());
    }
  }

  return freeze({
    node: memoize(() => {
      if (errors.errors().length > 0)
        { return undefined; }

      return IastNode.makeFunctionDefinition(nodes);
    }),
    errors: errors.errors
  });
}

function forExpression
  (tokens: Readonly<Token[]>, segment: Segment): IastBuild
{
  if (segment.type() !== 'expression') {
    raise('segment must be an expression');
  }
  const errors = ErrorsCollector.make();
  const collector = AstExpressionCollector.make();
  let cidx = 0;
  const child = () => segment.children()[cidx];
  for (let idx = segment.start(); idx < segment.end(); ) {
    if (tokens[idx] === undefined) {
      raise('went too far?!');
    }
    if (idx === child()?.start()) {
      idx = child().end();
      ++cidx;
      const ibuild = strats[child().type()](tokens, child());
      const node = ibuild.node();
      if (node) {
        collector.pushNode(node);
      } else {
        errors.pushErrors(ibuild.errors());
      }
    } else {
      if (tokens[idx].type() === Token.types.operator) {
        collector.pushOperator(tokens[idx]);
      } else if (Segment.isFringe(tokens[idx])) {
        const node = IastNode.makeFringe(tokens[idx]);
        collector.pushNode(node);
      }
      // tolerate and ignore any groupings
      ++idx;
    }
  }

  return freeze({
    node: memoize(() => {
      if (errors.errors().length > 0)
        { return undefined; }

      const ibuild = collector.finish();
      if (!ibuild.node()) {
        errors.pushError(ibuild.error());
      }

      return ibuild.node();
    }),
    errors: errors.errors
  });
}

export const IastBuild = freeze({
  make(tokens: Readonly<Token[]>): IastBuild {
    const { segment, error } = FunctionBodySegmentation.
      make(tokens, 0, tokens.length);
    if (!segment()) {
      raise(error().message);
    }
    return strats['functionDefinitionBody'](tokens, segment()!);
  },
  buildFor(tokens: Readonly<Token[]>): IastNode {
    const inst = IastBuild.make(tokens);
    const res = inst.node();
    if (!res) {
      raise(`Failed to build AST:\n${inst.errors()[0]?.message}`);
    }
    return res;
  }
});
