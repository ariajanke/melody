import { TestHelpers } from '../test_helpers';
import {
  LetDeclarationsRetrieval,
  LetNameElement,
} from '../../src/dast_build/let_declarations_retrieval';
import { IastNode, IastVisitor, ReseatableIastVisitor } from '../../src/iast_node';
import { Token } from '../../src/token';
import { DastNode_ } from '../../src/dast_build/dast_node';
// import { DastBuildBase } from '../../src/dast_build/dast_build_base';
import { DastBuild } from '../../src/dast_build';
import { DastCall, DastTuple } from '../../src/dast_build/dast_node_specializations';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { Helpers, StandardError } from '../../src/helpers';

const { describeNamed } = TestHelpers;

const { freeze } = Helpers;

describeNamed({ LetDeclarationsRetrieval }, () => {
  const makeFringe = (v: string): IastNode =>
    IastNode.makeFringe(Token.forTesting.makeFromStringOnly(v));
  const { makeCall } = IastNode.forOperativeStatements;
  // const { makeFunctionDefinition } = IastNode;
  const { makeTuple } = IastNode.forLetDeclarationRetrievals;
  function makeEqual(lhs: IastNode, rhs: IastNode): IastNode {
    return makeCallFromString('=', lhs, rhs);
  }
  function makeAssignment(name: string, rhs: IastNode): IastNode {
    const { mapToAssignment } = FunctionNamingSchema;
    // NOTE this arrangement *never* occurs in an actual IAST
    //      it is a contrived way to create an assignment that works with our
    //      tests. Since we're testing support for DAST build, we cannot use
    //      it here.
    return makeCallFromString(
      mapToAssignment(name),
      makeFringe( Token.kContextToken.content() ),
      rhs);
  }
  function makeCallFromString(callName: string, rec: IastNode, args: IastNode): IastNode {
    return makeCall(Token.forTesting.makeFromStringOnly(callName), rec, args);
  }
  function makeSingleDecl(name: string, node: IastNode): IastNode {
    const assignment = makeEqual(makeFringe(name), node);
    return assignment;
  }
  function makeDoubleDecl(name1: string, name2: string, node: IastNode): IastNode {
    const tuple = IastNode.forOperativeStatements.tuplify(makeFringe(name1), makeFringe(name2));
    return makeEqual(tuple, node);
  }
  const toName = (el: LetNameElement | undefined): string | undefined => {
    if (!el)
      { return undefined; }
    if ('name' in el)
      { return el.name; }
    return el.names.join(',');
  };
  function stripNodesFrom(el: LetNameElement | undefined)
    : { name?: string, names?: Readonly<string[]>, operator?: string, dependeeNames?: Readonly<string[]> }
  {
    return {
      ...(el && 'names' in el && { names: el.names }),
      ...(el && 'name' in el && { name: el.name }),
      operator: el?.operator,
      dependeeNames: el?.dependeeNames
    };
  }
  const generallyIntoDastBuild = (() => {
    // const { makeFromNode } = DastBuildBase;
    const makeFromNode = (node: DastNode_): DastBuild => freeze({
      node: () => node,
      error: () => StandardError.make().error()
    });
    const forFringe = (fn: (v: string) => DastNode_) =>
      (str: string): DastBuild =>
        makeFromNode(fn(str));
    const visitor: IastVisitor<DastBuild> = {
      visitFringe: forFringe(DastNode_.makeFringe),
      visitInteger: forFringe(DastNode_.makeInteger),
      visitTuple(nodes: Readonly<IastNode[]>): DastBuild {
        return makeFromNode(DastTuple.make(nodes.map(node => node.visit(visitor).node()!)));
      },
      visitCall: (callName: IastNode, rec: IastNode, fArgs: IastNode): DastBuild =>
        makeFromNode(DastCall.
          make(callName.visit(visitor).node()!,
               rec.visit(visitor).node()!,
               fArgs.visit(visitor).node()!))
      // let that f****er raise if that function is undefined
    } as unknown as IastVisitor<DastBuild>;
    if ('setInstRef' in visitor) {
      const asReseatable = visitor as ReseatableIastVisitor;
      asReseatable.setInstRef(asReseatable);
    }
    return (node: IastNode): DastBuild =>
      node.visit(visitor);
  })();
  // const makeFromDastNode = (node: DastNode_): () => DastBuild =>
  //   () => DastBuildBase.makeFromNode(node);
  it('captures a single declaration', () => {
    // let a = 1
    const letDecl = makeSingleDecl('a', makeFringe('1'));
    const retrieval = LetDeclarationsRetrieval.
      make(letDecl, generallyIntoDastBuild);
    const res = retrieval.elements()?.map(toName);
    expect(res).toEqual(['a']);
  });

  it('captures a dependee that is a function call name', () => {
    // let a = f(x)
    const call = makeCallFromString('f', makeFringe(Token.kContextToken.content()), makeFringe('x'));
    const letDecl = makeSingleDecl('a', call);
    const retrieval = LetDeclarationsRetrieval.make(letDecl, generallyIntoDastBuild);
    const elements = retrieval.elements();
    expect(elements?.length).toBe(1);
    expect([...elements![0].dependeeNames].sort()).
      toEqual(['.f', '.x'].sort());
  });

  it('captures a dependee resulting from an assignment', () => {
    // let a = b := 1
    const assignment = makeAssignment('b', makeFringe('1'));
    const letDecl = makeSingleDecl('a', assignment);
    const retrieval = LetDeclarationsRetrieval.make(letDecl, generallyIntoDastBuild);
    const elements = retrieval.elements();
    expect(elements?.length).toBe(1);
    expect(elements![0].dependeeNames).toEqual(['b:=']);
  });

  // it('captures a couple of declaration', () => {
  //   // let a = 1
  //   // let b = 1
  //   const letA = makeSingleDecl('a', makeFringe('1'));
  //   const letB = makeSingleDecl('b', makeFringe('1'));
  //   const def = makeFunctionDefinition([letA, letB]);
  //   const res = LetDeclarationsRetrieval.
  //     make(def).elements()?.map(toName);
  //   expect(res).toEqual(['a', 'b']);
  // });

  it('handles a declaration with a dependee', () => {
    // let a = b + 4
    const addition = makeCallFromString('+', makeFringe('b'), makeFringe('4'));
    const letA = makeSingleDecl('a', addition);
    // const makeArg = (() => {
    //   const { makeFringe, makeInteger } = DastNode_;
    //   return makeFromDastNode(DastCall.make(
    //     makeFringe('+'), makeFringe('b'), makeInteger('4')));
    // })();
    const retrieval = LetDeclarationsRetrieval.make(letA, generallyIntoDastBuild);
    const firstEl = (retrieval.elements() ?? [])[0];
    const res = stripNodesFrom(firstEl);
    expect(res).toEqual({
      name: 'a',
      operator: '=',
      dependeeNames: ['.b']
    });
  });

  it('captures a multi-declaration many to many', () => {
    // let (x, y) = (a, b)
    const tuple = makeTuple([
      makeFringe('a'),
      makeFringe('b')
    ]);
    const decl = makeDoubleDecl('x', 'y', tuple);
    const res = LetDeclarationsRetrieval.
      make(decl, generallyIntoDastBuild).
      elements();
    expect(res?.map(toName)).toEqual(['x', 'y']);
    const firstRes = (res ?? [])[0];
    const secondRes = (res ?? [])[1];
    expect(stripNodesFrom(firstRes)).toEqual({
      name: 'x',
      operator: '=',
      dependeeNames: ['.a', '.b']
    });
    expect(stripNodesFrom(secondRes)).toEqual({
      name: 'y',
      operator: '=',
      dependeeNames: ['.a', '.b']
    });
  });

  it('captures a declaration of a tuple to a single variable', () => {
    // let a := (x, y)
    const tuple = makeTuple([
      makeFringe('x'),
      makeFringe('y')
    ]);
    const decl = makeSingleDecl('a', tuple);
    const res = (LetDeclarationsRetrieval.make(decl, generallyIntoDastBuild).elements() ?? [])[0];
    expect(stripNodesFrom(res)).
      toEqual({ name: 'a', operator: '=', dependeeNames: ['.x', '.y'] });
  });

  it('captures a multi-declaration to a single identifier', () => {
    // let (x, y) = a
    const decl = makeDoubleDecl('x', 'y', makeFringe('a'));
    const res = LetDeclarationsRetrieval.make(decl, generallyIntoDastBuild).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { names: ['x' , 'y'], operator: '=', dependeeNames: ['.a'] }
    ]);
  });

  it('covers caught test case', () => {
    // let (b, c, d) = a
    const tuple = makeTuple([
      makeFringe('b'),
      makeFringe('c'),
      makeFringe('d'),
    ]);
    const decl = makeEqual(tuple, makeFringe('a'));
    const res = LetDeclarationsRetrieval.make(decl, generallyIntoDastBuild).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { names: ['b', 'c', 'd'], operator: '=', dependeeNames: ['.a'] }
    ]);
  });
});
