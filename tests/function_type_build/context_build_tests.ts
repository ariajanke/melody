import { CodeWriter } from '../../src/code_writer';
import { DastLetDeclaration, DastLetDeclarations } from '../../src/dast_build';
import { DastNode_ } from '../../src/dast_build/dast_node';
import { DastTuple } from '../../src/dast_build/dast_node_specializations';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../../src/function_type_build';
import { IntegerType } from '../../src/function_type_build/builtin_type';
import { ContextBuild } from '../../src/function_type_build/context_build';
import { ContextTypeBuilder } from '../../src/function_type_build/context_type_builder';
import { TupleObjectFactory } from '../../src/function_type_build/tuple_type';
import { Helpers, StandardError } from '../../src/helpers';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

const { freeze, memoize } = Helpers;

describeNamed({ ContextBuild }, () => {
  const makeContextBuilder =
    (callDict: { [name: string]: string[] }): ContextTypeBuilder =>
  {
    const dummyFtype = {} as FunctionType;
    const { mapToInitialSetName } = FunctionNamingSchema;
    const inst = freeze({
      addDirectLookUp(name: string, _1: FunctionLookUpTable): ContextTypeBuilder {
        (callDict['addDirectLookUp'] ??= []).push(name);
        return {} as ContextTypeBuilder;
      },
      addModifier(name: string, _1: ObjectType): FunctionType {
        (callDict['addModifier'] ??= []).push(name);
        return dummyFtype;
      },
      addAccessor(name: string, _1: ObjectType): FunctionType {
        (callDict['addAccessor'] ??= []).push(name);
        return dummyFtype;
      },
      addInitialSet(name: string | readonly string[], _1: ObjectType)
        : FunctionTypeBuild
      {
        (callDict['addInitialSet'] ??= []).push(mapToInitialSetName(name));
        return {} as FunctionTypeBuild;
      },
      objectType(): ObjectType {
        return {
          name: () => 'FromContextTypeBuilder',
          lookUp(_0: string | symbol) { return undefined; },
          detuplify: () => undefined,
          uid: memoize(Symbol),
          sizeInBytes: () => 0,
          sizeInStackItems: () => 0,
          stackCleanUp: () => ({}) as FunctionType
        };
      }
    });
    return inst;
  };

  const integerType = IntegerType.instance;
  const intPairTuple = memoize(() =>
    TupleObjectFactory.make([integerType(), integerType()]));

  const { makeInteger } = DastNode_;
  const makePair = (a: string, b: string) =>
    DastTuple.make([makeInteger(a), makeInteger(b)]);

  const turnIntoFTypeBuild = (node: DastNode_) => freeze({
    functionType(): FunctionType {
      return freeze({
        parameters: TupleObjectFactory.emptyTuple,
        returns: memoize(() =>
          node.asString() === undefined ? intPairTuple() : integerType()),
        emit: (writer: CodeWriter) => writer,
        uid: memoize(Symbol)
      });
    },
    error: StandardError.make().error
  });

  const makeContextBuild =
    (callDict: { [name: string]: string[] }, defs: DastLetDeclarations) =>
  ContextBuild.make(
    defs,
    turnIntoFTypeBuild,
    <T>(_0: () => ObjectType, whileFn: () => T): T => whileFn(),
    makeContextBuilder(callDict)
  );

  function singleX(operator: string): DastLetDeclaration {
    return {
      name: 'x',
      operator,
      value: makeInteger('1'),
      dependeeNames: []
    };
  }

  function makeContextBuildWithSingleX
    (operator: string, callDict: { [name: string]: string[] })
  {
    return makeContextBuild(callDict, [singleX(operator)]);
  }

  function makeValidPair(operator: string): DastLetDeclaration {
    return {
      names: ['x', 'y'],
      operator,
      value: makePair('1', '2'),
      dependeeNames: []
    };
  }

  describe('handling of ":=" operator', () => {
    it('defines a modifier, accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX(':=', callDict);

      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x'],
        addAccessor: ['x'],
        addInitialSet: ['<initSet>:(x)']
      });
    });

    it('defines functions for mutliple variables', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, [
        singleX(':='),
        {
          name: 'y',
          operator: ':=',
          value: makeInteger('1'),
          dependeeNames: []
        }
      ]);
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x', 'y'],
        addAccessor: ['x', 'y'],
        addInitialSet: ['<initSet>:(x)', '<initSet>:(y)']
      });
    });

    it('defines functions for tuple named definitions', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, [
        makeValidPair(':=')
      ]);
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x', 'y'],
        addAccessor: ['x', 'y'],
        addInitialSet: ['<initSet>:(x,y)']
      });
    });

    it('fails if tuple type does not match names', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, [
        {
          names: ['x'],
          operator: ':=',
          value: makePair('1', '2'),
          dependeeNames: []
        }
      ]);
      const result = contextBuild.contextType();
      expect(result).toBeUndefined();
      expect(contextBuild.error().message).
        toEqual('Expected tuple type of 1 element(s) for names');
    });
  });

  describe('handling of "=" operator', () => {
    it('defines a accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX('=', callDict);

      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addAccessor: ['x'],
        addInitialSet: ['<initSet>:(x)']
      });
    });

    it('defines tuple named definitions', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, [
        makeValidPair('=')
      ]);
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addAccessor: ['x', 'y'],
        addInitialSet: ['<initSet>:(x,y)']
      });
    });
  });
});
