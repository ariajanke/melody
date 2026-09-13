import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IastNode } from '../iast_node';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorDefinition, OperatorDefinitions } from './operator_definitions';
// import { ReceiverNameStripping } from './receiver_name_stripping';

const { freeze, memoize } = Helpers;

export interface OperatorConstructorBuild {
  operatorConstructor(): OperatorConstructor | undefined;
  error(): StandardErrorMessage;
};

const isOperator = () => true;
const isNotOperator = () => false;
const asNoToken = (): Token | undefined => undefined;
function makeNodeMakerFor(node: IastNode) {
  return (_0: NodeConstructorCollection): IastNode => node;
}

const kSecret = Symbol();

type OperatorPrecedence = { precedence: number; position: number; };

type BinaryConstructor = (rec: IastNode, params: IastNode) => IastNode;

type UnaryConstructor = (rec: IastNode) => IastNode;

type NodeArrayModifier = (ctors: NodeConstructorCollection) => IastNode;

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
      // const { nameTarget, strippedTree } = ReceiverNameStripping.make(rec);
      // if (nameTarget()) {
      //   return IastNode.forOperativeStatements.
      //     makeCall(nameTarget()!, strippedTree()!, params);  
      // }
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
  const empty = IastNode.emptyTupleInstance();
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
  return (ctors: NodeConstructorCollection): IastNode => {
    const recCtor = ctors.at(position - 1);
    const paramsCtor = ctors.at(position + 1);
    const rec = recCtor.makeNode(ctors);
    const params = paramsCtor.makeNode(ctors);
    const node = nodeConstructor(rec, params);
    const opc: NodeConstructor = freeze({
      isOperator: isNotOperator,
      asToken: asNoToken,
      makeNode: makeNodeMakerFor(node),
      lowPosition: recCtor.lowPosition,
      highPosition: paramsCtor.highPosition
    });
    // replace positions here are wrong, you must replace extreme left and right
    // and rec/params maybe further than -1 or +1!
    ctors.replace(opc);
    return node;
  };
}

function makeArrayModifierForUnary
  (nodeConstructor: UnaryConstructor, position: number): NodeArrayModifier 
{
  return (ctors: NodeConstructorCollection): IastNode => {
    const recCtor = ctors.at(position + 1);
    const rec = recCtor.makeNode(ctors);
    const node = nodeConstructor(rec);
    const opc: NodeConstructor = freeze({
      isOperator: isNotOperator,
      asToken: asNoToken,
      makeNode: makeNodeMakerFor(node),
      lowPosition: () => position,
      highPosition: recCtor.highPosition,
    });
    ctors.replace(opc);
    return node;
  };
}

function make(mOpToken: Token, mIsUnaryContext: boolean, mPosition: number): OperatorConstructorBuild {
  OperatorDefinitions.assertIsOperator(mOpToken.content());
  const { error, setErrorMessage } = StandardError.make();

  const position = () => mPosition;

  const operatorDefinition = memoize((): OperatorDefinition | undefined => {
    const getOperatorInfo = mIsUnaryContext ?
      OperatorDefinitions.unaryMappings :
      OperatorDefinitions.binaryMappings;
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
    const position = mPosition*( info.isPositionReversed ? -1 : 1 );

    return freeze({
      precedence: info.precedence,
      position
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
      makeNode: makeNodeFunc()!,
      asToken: () => mOpToken,
      lowPosition: position,
      highPosition: position
    });
  });
  
  return freeze({ operatorConstructor, error });
}

export const OperatorConstructorBuild = freeze({ make });
