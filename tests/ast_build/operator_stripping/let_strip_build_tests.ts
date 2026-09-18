import { Helpers } from '../../../src/helpers';
import { LetStripBuild } from '../../../src/ast_build/operator_stripping/let_strip_build';
import { StripBuild } from '../../../src/ast_build/operator_stripping/strip_build';
import { AstNode, AstInitializerType } from '../../../src/ast_node';
import { Token } from '../../../src/token';
import { AstFactories } from '../../ast_factories';
import { ReseatableAstVisitor } from '../../ast_visitor_factories';
import { TestHelpers } from '../../test_helpers';
import { TokenFactories } from '../../token_factories';

const { memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ LetStripBuild }, () => {
  const makeVisitor = ReseatableAstVisitor.makeSelfModified;
  const makeDefaultVisitor = ReseatableAstVisitor.makeDefaultingToContinue;
  const { emptyTupleInstance, makeFringe, makeCall } = AstFactories;
  const recurseOn = (n: AstNode): AstNode | undefined => n;
  const unusedCallName = TokenFactories.makeFromStringOnly('let');
  const makeLet = (inner: AstNode) =>
    makeCall('let', inner, emptyTupleInstance());
  const aNode = memoize(() => makeFringe('a'));
  const bNode = memoize(() => makeFringe('b'));
  const someNode = memoize(() => makeFringe('5'));
  const makeInst = (recurseOn_: typeof recurseOn, rec: AstNode) =>
    memoize(() => LetStripBuild.make(recurseOn_, unusedCallName, rec, emptyTupleInstance()));
  const validASet = memoize(() => makeCall('=', aNode(), someNode()));

  function isUndefined(inst: () => StripBuild) {
    it('is undefined', () => {
      expect(inst().node()).toBeUndefined();
    });
  }

  function hasError(inst: () => StripBuild, errorString: string) {
    isUndefined(inst);

    it(`has "${errorString}" error`, () => {
      inst().node();
      expect(inst().error().message).toEqual(errorString);
    });
  }

  function isSuccessful
    (inst: () => StripBuild, exNames: Readonly<string[]>, exGroup: AstInitializerType)
  {
    it('is a valid node', () => {
      expect(inst().node()).toBeDefined();
    });

    it('is correct initializer node', () => {
      const names: string[] = [];
      let group = '';
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitInitializer(
          names_: Readonly<Token[]>,
          group_: AstInitializerType,
          _2: AstNode)
        {
          names.push(...names_.map(t => t.content()));
          group = group_;
        }
      });
      
      const node = inst().node();
      if (node !== undefined && node !== 'not-modified') {
        node.visit(visitor);
      }
      expect(names).toEqual(exNames);
      expect(group).toEqual(exGroup);
    });
  }

  describe('on "let let ..."', () => {
    const inst = makeInst(recurseOn, makeLet( aNode() ));

    hasError(inst, 'let must be declared with either "=" or ":="');
  });

  describe('on "let \'beans\'" = ...', () => {
    const inst = makeInst(recurseOn, makeCall('=', makeFringe(`'beans'`), makeFringe('1')) );

    hasError(inst, 'invalid name set');
  });

  describe('on "let a + b"', () => {
    const inst = makeInst(recurseOn, makeCall('+', aNode(), bNode()));

    hasError(inst, 'let must be declared with either "=" or ":="');
  });

  describe('if recursion helper returns undefined', () => {
    const recursionFails = (_0: AstNode) => undefined;
    const inst = makeInst(recursionFails, validASet());

    isUndefined(inst);
  });


  describe('successfully makes node for "let a = ..."', () => {
    const inst = makeInst(recurseOn, validASet());

    isSuccessful(inst, ['a'], '=');
  });

  describe('successfully makes node for "let b := ..."', () => {
    const inst = makeInst(recurseOn, makeCall(':=', bNode(), someNode()));

    isSuccessful(inst, ['b'], ':=');
  });

  describe('successfully makes node for "let (a, b) := ..."', () => {
    const tuple = () => AstFactories.makeTuple([ aNode(), bNode() ]);
    const inst = makeInst(recurseOn, makeCall(':=', tuple(), someNode()));

    isSuccessful(inst, ['a', 'b'], ':=');
  });
});
