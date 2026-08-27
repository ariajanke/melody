import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IastNode, IastVisitor } from '../iast_node';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { OperatorDefinition, OperatorDefinitionsN } from './operator_definitions_n';
import { ReceiverNameStripping } from './receiver_name_stripping';
import { Segment, SegmentType } from './segment';

const { freeze, memoize } = Helpers;

// I'm a bit of an outsider. For me coding can be like an art.
// One particular challenge that I'm faced with is breaking up an array of
// things into a nested collections. Right away I'm sure you realize that a
// solution would have to be recursive in nature. Since it's recursive, the
// design and look of what you're trying to build is unclear. I'm framing my approach like trying to answer a question. By question here, I mean something 






// start at root fn body ->
// - close body rule
// - seperators for sub-groupings
// 

// segments -> IAST nodes
// including operative statements into call trees

// do not name strip for ":=" in lets (except rhs)
// name strip for calls if possible

interface IastBuild {
  node(): IastNode | undefined;
  errors(): Readonly<StandardErrorMessage[]>;
};

interface IastBuildSingleError {
  node(): IastNode | undefined;
  error(): StandardErrorMessage;
};

interface AstExpressionCollector {
  pushNode(node: IastNode): void;
  pushOperator(op: Token): void;
  finish(): IastBuildSingleError;
};

interface NodeConstructor {
  makeNode(ctors: NodeConstructor[]): IastNode;
  isOperator(): boolean;
};

interface OperatorConstructor extends NodeConstructor {
  compare(other: OperatorConstructor): number;
};

const OperatorConstructor = freeze({
  fromNode(node: IastNode): NodeConstructor {
    return freeze({
      isOperator: () => false,
      makeNode(_0: NodeConstructor[]): IastNode {
        return node;
      }
    });
  }
});

interface OperatorConstructorBuild {
  operatorConstructor(): OperatorConstructor | undefined;
  error(): StandardErrorMessage;
};

const OperatorConstructorBuild = (() => {

  const isOperator = () => true;

  const kSecret = Symbol();

  type OperatorPrecedence = { precedence: number; position: number; };

  type BinaryConstructor = (rec: IastNode, params: IastNode) => IastNode;

  type UnaryConstructor = (rec: IastNode) => IastNode;

  type NodeArrayModifier = (ctors: NodeConstructor[]) => IastNode;

  function asOpC(op: OperatorConstructor): OperatorPrecedence | undefined {
    return (op as unknown as { [kSecret]: OperatorPrecedence | undefined })[kSecret];
  }

  function binaryNodeConstructorFor
    (callName: Token): BinaryConstructor
  {
    const op = callName.content();
    if (op === OperatorNamingSchema.kComma) {
      return (lhs: IastNode, rhs: IastNode) =>
        IastNode.forOperativeStatements.tuplify(lhs, rhs);
    }
    if (op === OperatorNamingSchema.kCall) {
      return (rec: IastNode, params: IastNode) => {
        const { nameTarget, strippedTree } = ReceiverNameStripping.make(rec);
        if (nameTarget()) {
          return IastNode.forOperativeStatements.
            makeCall(nameTarget()!, strippedTree()!, params);  
        }
        return IastNode.forOperativeStatements.makeCall(callName, rec, params);
      };
    }
    return (rec: IastNode, params: IastNode) =>
      IastNode.forOperativeStatements.makeCall(callName, rec, params);
  }

  function unaryNodeConstructorFor
    (op: Token): UnaryConstructor
  {
    if (op.content() === OperatorNamingSchema.kLet) {
      return (inner: IastNode) =>
        IastNode.forOperativeStatements.makeLetDeclation(inner);
    }
    const empty = IastNode.makeEmptyTuple();
    return (rec: IastNode) =>
      IastNode.forOperativeStatements.makeCall(op, rec, empty);
  }

  function makeCompareFunc(info: OperatorPrecedence): (other: OperatorConstructor) => number {
    return (other: OperatorConstructor) => {
      const otherInfo = asOpC(other) ?? raise('not a valid operator instance');
      const diff = info!.precedence - otherInfo.precedence;
      if (diff === 0) {
        return info.position - otherInfo.position;
      }
      return diff;    
    };
  }

  function makeArrayModifierForBinary
    (nodeConstructor: BinaryConstructor, position: number): NodeArrayModifier 
  {
    return (ctors: NodeConstructor[]): IastNode => {
      const recCtor = ctors[position - 1];
      const paramsCtor = ctors[position + 1];
      const rec = recCtor.makeNode(ctors);
      const params = paramsCtor.makeNode(ctors);
      const node = nodeConstructor(rec, params);
      ctors[position - 1] = ctors[position + 1] = OperatorConstructor.fromNode(node);
      return node;
    };
  }

  function makeArrayModifierForUnary
    (nodeConstructor: UnaryConstructor, position: number): NodeArrayModifier 
  {
    return (ctors: NodeConstructor[]): IastNode => {
      const recCtor = ctors[position + 1];
      const rec = recCtor.makeNode(ctors);
      const node = nodeConstructor(rec);
      ctors[position] = ctors[position + 1] = OperatorConstructor.fromNode(node);
      return node;
    };
  }

  function make(mOpToken: Token, mIsUnaryContext: boolean, mPosition: number): OperatorConstructorBuild {
    OperatorDefinitionsN.assertIsOperator(mOpToken.content());
    const { error, setErrorMessage } = StandardError.make();

    const operatorDefinition = memoize((): OperatorDefinition | undefined => {
      const getOperatorInfo = mIsUnaryContext ?
        OperatorDefinitionsN.unaryMappings :
        OperatorDefinitionsN.binaryMappings;
      const info = getOperatorInfo()[mOpToken.content()];
      if (!info) {
        const context = mIsUnaryContext ? 'unary' : 'binary';
        return setErrorMessage(
          `"${mOpToken.content()}" is not a valid operator (at least for ` +
          `the ${context} context)`);
      }

      return info;
    });

    const operatorPrecedence = memoize((): OperatorPrecedence | undefined => {
      const info = operatorDefinition();
      if (!info)
        { return undefined; }

      return freeze({
        precedence: info.precedence,
        position: mPosition
      });
    });

    const makeNodeFunc = ((): NodeArrayModifier | undefined => {
      operatorDefinition() ?? raise('bad branch');

      if (operatorDefinition()!.relation === 'binary') {
        const ctor = binaryNodeConstructorFor(mOpToken);
        return makeArrayModifierForBinary(ctor, mPosition);
      }

      const ctor = unaryNodeConstructorFor(mOpToken);
      return makeArrayModifierForUnary(ctor, mPosition);
    });

    const operatorConstructor = memoize((): OperatorConstructor | undefined => {
      if (!operatorPrecedence())
        { return undefined; }

      return freeze({
        [kSecret]: operatorPrecedence()!,
        isOperator,
        compare: makeCompareFunc(operatorPrecedence()!),
        makeNode: makeNodeFunc()!
      });
    });
    
    return freeze({ operatorConstructor, error });
  }

  return freeze({ make });
})();

const AstExpressionCollector = freeze({
  make(): AstExpressionCollector
{
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mConstructors: NodeConstructor[] = [];
  const mOperators: OperatorConstructor[] = [];
  let mFinished = false;
  function verifyUnfinished() {
    if (!mFinished)
      { return; }

    raise('cannot add to collector after it is finished');
  }
  
  function isInUnaryContext() {
    return mConstructors.length === 0 ||
           mConstructors[mConstructors.length - 1].isOperator();
  }

  return freeze({
    pushNode(node: IastNode): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      mConstructors.push(OperatorConstructor.fromNode(node));
    },
    pushOperator(op: Token): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      const { operatorConstructor, error } = OperatorConstructorBuild.
        make(op, isInUnaryContext(), mConstructors.length);

      if (!operatorConstructor()) {
        return setErrorFn(error); // <- set error
      }
      const opCtor = operatorConstructor()!
      mConstructors.push(opCtor);
      mOperators.push(opCtor);
    },
    finish: memoize(() => {
      mFinished = true;
      if (hasErrorSet()) {
        return freeze({
          node: () => undefined,
          error
        });
      }

      const opsAtPrec = mOperators.
        sort((a: OperatorConstructor, b: OperatorConstructor) => a.compare(b));
      return freeze({
        node: memoize(() => {
          for (let i = 0; i < opsAtPrec.length - 1; ++i) {
            opsAtPrec[i].makeNode(mConstructors);
          }
          return opsAtPrec[opsAtPrec.length - 1].makeNode(mConstructors);
        }),
        error
      });
    })
  });
  }
});

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
    })
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

// fine for nested parens...
function forExpression
  (tokens: Readonly<Token[]>, segment: Segment): IastBuild
{
  const errors = ErrorsCollector.make();
  const collector = AstExpressionCollector.make();
  let cidx = 0;
  let child = segment.children()[cidx];
  for (let idx = segment.start(); idx < segment.end(); ) {
    if (tokens[idx] === undefined) {
      raise('went too far?!');
    }
    if (idx === child?.start()) {
      idx = child.end();
      ++cidx;
      const ibuild = strats[child.type()](tokens, child);
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
