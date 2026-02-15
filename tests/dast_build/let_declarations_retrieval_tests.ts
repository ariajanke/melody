import { TestHelpers } from '../test_helpers';
import {
  LetDeclarationsRetrieval,
  LetNameElement,
} from '../../src/dast_build/let_declarations_retrieval';
import { IastNode } from '../../src/iast_node';
import { Token } from '../../src/token';

const { describeNamed } = TestHelpers;

describeNamed({ LetDeclarationsRetrieval }, () => {
  const makeFringe = (v: string) =>
    IastNode.makeFringe(Token.forTesting.makeFromStringOnly(v));
  const { makeCall, makeLetDeclation } = IastNode.forOperativeStatements;
  const { makeFunctionDefinition } = IastNode;
  const { makeTuple } = IastNode.forLetDeclarationRetrievals;
  function makeEqual(lhs: IastNode, rhs: IastNode) {
    return makeCallFromString('=', lhs, rhs);
  }
  function makeCallFromString(callName: string, rec: IastNode, args: IastNode) {
    return makeCall(Token.forTesting.makeFromStringOnly(callName), rec, args);
  }
  function makeSingleDecl(name: string, node: IastNode): IastNode {
    const assignment = makeEqual(makeFringe(name), node);
    return makeLetDeclation(assignment);
  }
  function makeDoubleDecl(name1: string, name2: string, node: IastNode) {
    const tuple = IastNode.forOperativeStatements.tuplify(makeFringe(name1), makeFringe(name2));
    return makeLetDeclation(makeEqual(tuple, node));
  }
  const toName = (el: LetNameElement | undefined) => {
    if (!el)
      { return undefined; }
    if ('name' in el)
      { return el.name; }
    return el.names.join(',');
  };
  function stripNodesFrom(el: LetNameElement | undefined) {
    return {
      ...(el && 'names' in el && { names: el.names }),
      ...(el && 'name' in el && { name: el.name }),
      operator: el?.operator,
      dependeeNames: el?.dependeeNames
    };
  }
  it('captures a single declaration', () => {
    // let a = 1
    const letDecl = makeSingleDecl('a', makeFringe('1'));
    const retrieval = LetDeclarationsRetrieval.make(letDecl);
    const res = retrieval.elements()?.map(toName);
    expect(res).toEqual(['a']);
  });

  it('captures a couple of declaration', () => {
    // let a = 1
    // let b = 1
    const letA = makeSingleDecl('a', makeFringe('1'));
    const letB = makeSingleDecl('b', makeFringe('1'));
    const def = makeFunctionDefinition([letA, letB]);
    const res = LetDeclarationsRetrieval.
      make(def).elements()?.map(toName);
    expect(res).toEqual(['a', 'b']);
  });

  it('handles a declaration with a dependee', () => {
    // let a = b + 4
    const addition = makeCallFromString('+', makeFringe('b'), makeFringe('4'));
    const letA = makeSingleDecl('a', addition);
    const firstEl = (LetDeclarationsRetrieval.make(letA).elements() ?? [])[0];
    const res = stripNodesFrom(firstEl);
    expect(res).toEqual({
      name: 'a',
      operator: '=',
      dependeeNames: ['b']
    });
  });

  it('captures a multi-declaration', () => {
    // let (x, y) = (a, b)
    const tuple = makeTuple([
      makeFringe('a'),
      makeFringe('b')
    ]);
    const decl = makeDoubleDecl('x', 'y', tuple);
    const res = LetDeclarationsRetrieval.make(decl).elements();
    expect(res?.map(toName)).toEqual(['x', 'y']);
    const firstRes = (res ?? [])[0];
    const secondRes = (res ?? [])[1];
    expect(stripNodesFrom(firstRes)).toEqual({
      name: 'x',
      operator: '=',
      dependeeNames: ['a', 'b']
    });
    expect(stripNodesFrom(secondRes)).toEqual({
      name: 'y',
      operator: '=',
      dependeeNames: ['a', 'b']
    });
  });

  it('captures a declaration of a tuple to a single variable', () => {
    // let a := (x, y)
    const tuple = makeTuple([
      makeFringe('x'),
      makeFringe('y')
    ]);
    const decl = makeSingleDecl('a', tuple);
    const res = (LetDeclarationsRetrieval.make(decl).elements() ?? [])[0];
    expect(stripNodesFrom(res)).
      toEqual({ name: 'a', operator: '=', dependeeNames: ['x', 'y'] });
  });

  it('captures a multi-declaration to a single identifier', () => {
    // let (x, y) = a
    const decl = makeDoubleDecl('x', 'y', makeFringe('a'));
    const res = LetDeclarationsRetrieval.make(decl).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { names: ['x' , 'y'], operator: '=', dependeeNames: ['a'] }
    ]);
  });

  it('covers caught test case', () => {
    // let (b, c, d) = a
    const tuple = makeTuple([
      makeFringe('b'),
      makeFringe('c'),
      makeFringe('d'),
    ]);
    const decl = makeLetDeclation(makeEqual(tuple, makeFringe('a')));
    const res = LetDeclarationsRetrieval.make(decl).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { names: ['b', 'c', 'd'], operator: '=', dependeeNames: ['a'] }
    ]);
  });
});
