import { TestHelpers } from './test_helpers';
import {
  OperativeStatementBuilder,
  OperativeStatementVisitable,
  OperativeStatementVisitor
} from '../src/operative_statement_builder';
import { Token } from '../src/token';
import { AstNode } from '../src/ast_node';
import { OperatorDefinitions } from '../src/operator_definitions';

const { describeNamed } = TestHelpers;

describeNamed({ OperativeStatementBuilder }, () => {
  const { binary, unary } = OperatorDefinitions.operandRelationships;
  const operatorToOperandRelationMap = Object.freeze({
    ['+']: binary,
    ['*']: binary,
    [',']: binary,
    ['let']: unary,
    [':=']: binary,
  });
  const makeToken = Token.forTesting.makeFromStringOnly;
  const makeCompletion = (tokens: Token[]) => OperativeStatementBuilder.
    makeFromTokens(tokens, operatorToOperandRelationMap).
    completion();
  const workCollection = (tokens: Token[]) =>
    makeCompletion(tokens).
    rootVisitable();
  const makeTokens = (...arr: string[]) => arr.map(makeToken);
  const makeVisitor = (mStackedArr: string[]): OperativeStatementVisitor => {
    const inst = ({
      visitToken   : (token: Token) => {
        mStackedArr.push(token.content());
      },
      visitNode    : (_node: AstNode) => {
        throw new Error('should not directly add nodes for this test');
      },
      visitLinks:
        (low: OperativeStatementVisitable,
         visitDatum: (visitor: OperativeStatementVisitor) => void,
         high: OperativeStatementVisitable) =>
      {
        visitDatum(inst);
        low.visit(inst);
        high.visit(inst);
      }
    });
    return inst;
  };

  // I'm a DooFuS it produces listings in DFS order

  it('a + b', () => {
    const res = workCollection(makeTokens('a', '+', 'b'));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).toEqual(['+', 'a', 'b']);
  });

  it('a * b + c' , () => {
    const res = workCollection(makeTokens('a', '*', 'b', '+', 'c'));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).toEqual(['+', '*', 'a', 'b', 'c']);
  });

  it('a + b * c' , () => {
    const res = workCollection(makeTokens('a', '+', 'b', '*', 'c'));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).toEqual(['+', 'a', '*', 'b', 'c']);
  });

  it('a + b * c + d', () => {
    const res = workCollection(makeTokens('a', '+', 'b', '*', 'c', '+', 'd'));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).toEqual(['+', '+', 'a', '*', 'b', 'c', 'd']);
  });

  it('a, b + c, d * e + f', () => {
    const res = workCollection(makeTokens(
      'a', ',', 'b', '+', 'c', ',', 'd', '*', 'e', '+', 'f'
    ));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).
      toEqual([',', ',', 'a', '+', 'b', 'c', '+', '*', 'd', 'e', 'f']);
  });

  it('let a := b', () => {
    const res = workCollection(makeTokens(
      'let', 'a', ':=', 'b'
    ));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).
      toEqual(['let', ':=', 'a', 'b']);
  });

  it('let a := b + c * d', () => {
    const res = workCollection(makeTokens(
      'let', 'a', ':=', 'b', '+', 'c', '*', 'd'
    ));
    const stackedArr: string[] = [];
    res?.visit(makeVisitor(stackedArr));
    expect(stackedArr).
      toEqual(['let', ':=', 'a', '+', 'b', '*', 'c', 'd']);
  });

  it('a + + a', () => {
    const { rootVisitable, error } = makeCompletion(makeTokens('a', '+', '+', 'a'));
    expect(rootVisitable()).toBeUndefined();
    expect(error().message).toEqual('Something messed up around +');
  });

  it('let a 3', () => {
    const { rootVisitable, error } = makeCompletion(makeTokens('let', 'a', '3'));
    expect(rootVisitable()).toBeUndefined();
    expect(error().message).toEqual('Something messed up around +');
  })
});
