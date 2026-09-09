import { Helpers, raise } from '../../src/helpers';
import { AstExpressionCollector } from '../../src/iast_build/ast_expression_collector';
import { IastNode } from '../../src/iast_node';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { Token } from '../../src/token';
import { ReseatableIastVisitor } from '../iast_visitor_factories';
import { TestHelpers } from '../test_helpers';
import { TokenFactories } from '../token_factories';

const { freeze, memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ AstExpressionCollector }, () => {
  const makeVisitor = ReseatableIastVisitor.makeSelfModified;
  const makeDefaultVisitor = ReseatableIastVisitor.makeDefaultingToContinue;
  const makeToken = TokenFactories.makeFromStringOnly;
  const kCallToken: Token = freeze({
    content: () => OperatorNamingSchema.kCall,
    type   : () => Token.types.operator,
    start  : () => raise('!!'),
    end    : () => raise('!!')
  });

  const makeInst = (mixed: Readonly<(IastNode | Token)[]>) =>
    memoize((): AstExpressionCollector => mixed.
      reduce((prev: AstExpressionCollector, v: IastNode | Token) => {
        if ('content' in v) {
          if (v.type() === Token.types.identifier) {
            prev.pushNode(IastNode.makeFringe(v));
          } else {
            prev.pushOperator(v);
          }
        } else {
          prev.pushNode(v);
        }
        return prev;
      },
      AstExpressionCollector.make()));

  it('<empty expression>', () => {
    const inst = makeInst([]);
    const { node } = inst().finish();
    expect(node()).toBeDefined();
  });

  function identifiersFromInst(inst: () => AstExpressionCollector): string[] {
    const strings: string[] = [];
    const visitor = makeVisitor({
      ...makeDefaultVisitor(),
      visitFringe(t: Token) {
        strings.push(t.content());
      }
    });
    const { node } = inst().finish();
    expect(node()).toBeDefined();
    node()?.visit(visitor);
    return strings;
  }

  function identifiersFrom(tokStrings: Readonly<string[]>): string[] {
    return identifiersFromInst(makeInst(tokStrings.map(makeToken)));
  }

  function callsFromInst(inst: () => AstExpressionCollector): string[] {
    const { node } = inst().finish();
    const calls: string[] = [];
    const visitor = makeVisitor({
      ...makeDefaultVisitor(),
      visitLet(innerNode: IastNode) {
        calls.push('let');
        innerNode.visit(visitor);
      },
      visitCall(callName: Token, receiver: IastNode, args: IastNode) {
        calls.push(callName.content());
        receiver.visit(visitor);
        args.visit(visitor);
      }
    });
    expect(node()).toBeDefined();
    node()?.visit(visitor);
    return calls;
  }

  function callsFrom(tokStrings: Readonly<string[]>): string[] {
    return callsFromInst(makeInst(tokStrings.map(makeToken)));
  }

  it('<single> a', () => {
    const strings = identifiersFrom(['a']);
    expect(strings).toEqual(['a']);
  });

  it('<double> a, b', () => {
    const strings = identifiersFrom(['a', ',', 'b']);
    expect(strings).toEqual(['a', 'b']);
  });

  it('<triple> a, b, c', () => {
    const strings = identifiersFrom(['a', ',', 'b', ',', 'c']);
    expect(strings).toEqual(['a', 'b', 'c']);
  });

  it('let a := b', () => {
    const calls = callsFrom(['let', 'a', ':=', 'b']);
    expect(calls).toEqual(['let', ':=']);
  });

  it('a*b + c', () => {
    const calls = callsFrom(['a', '*', 'b', '+', 'c']);
    expect(calls).toEqual(['+', '*']);
  });

  it('not a or b and c', () => {
    // this is: "not ((a or b) and c)" in this language
    const calls = callsFrom(['not', 'a', 'or', 'b', 'and', 'c']);
    expect(calls).toEqual(['not', 'and', 'or']);
  });

  it('not not a', () => {
    const calls = callsFrom(['not', 'not', 'a']);
    expect(calls).toEqual(['not', 'not']);
  });

  it('a / -b', () => {
    const calls = callsFrom(['a', '/', '-', 'b']);
    expect(calls).toEqual(['/', '-']);
  });

  // it('let a, b = not c, d', () => {
  //   const calls = callsFrom(['let', 'a', ',', 'b', '=', 'not', 'c', ',', 'd']);
  //   expect(calls).toEqual(['let']);
  // });

  it('foo()', () => {
    const in_ = [
      makeToken('foo'), kCallToken, IastNode.emptyTupleInstance()
    ];
    const inst = makeInst(in_);
    const calls = callsFromInst(inst);
    expect(calls).toEqual(['<call>']);
  });

  describe('foo.bar().baz', () => {
    const in_ = [
      makeToken('foo'), makeToken('.'), makeToken('bar'),
      kCallToken, IastNode.emptyTupleInstance(), makeToken('.'),
      makeToken('baz')
    ];

    const inst = makeInst(in_);

    it('has correct calls', () => {  
      const calls = callsFromInst(inst);
      expect(calls).toEqual(['<call>', '.', '.']);
      fail(); // this is wrong :(
    });

    it('has correct identifiers', () => {
      const ids = identifiersFromInst(inst);
      expect(ids).toEqual(['foo', 'bar', 'baz']);
    });
  });

  it('<fails> a + + b', () => {
    const { node, error } =
      makeInst(['a', '+', '+', 'b'].map(makeToken))().finish();
    expect(node()).toBeUndefined();
    expect(error().message).toEqual('"+" is not a valid operator (at least for the unary context)');
  });

  it('<fails> a + b c + d', () => {
    const { node } =
      makeInst(['a', '+', 'b', 'c', '+', 'd'].map(makeToken))().finish();
    expect(node()).toBeUndefined();
  });
});
