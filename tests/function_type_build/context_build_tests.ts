import { CodeWriter } from '../../src/code_writer';
import { DastAttributeDeclaration, DastDeclarationMap, WritableDastDeclarationMap } from '../../src/dast_build';
import { DastNode_ } from '../../src/dast_build/dast_node';
import { DastTuple } from '../../src/dast_build/dast_node_specializations';
import { ContextFunctionGroup, FunctionNamingSchema } from '../../src/function_naming_schema';
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
    const sampleFBuild = freeze({
      functionType(): FunctionType {
        return {} as FunctionType;
      },
      error: StandardError.make().error
    });
    const inst = freeze({
      addDirectLookUp(name: string, _1: FunctionLookUpTable): ContextTypeBuilder {
        (callDict['addDirectLookUp'] ??= []).push(name);
        return {} as ContextTypeBuilder;
      },
      addModifier(name: string, _1: DastAttributeDeclaration, _2: ObjectType): FunctionTypeBuild {
        (callDict['addModifier'] ??= []).push(name);
        return sampleFBuild;
      },
      addAccessor(name: string, _1: DastAttributeDeclaration, _2: ObjectType): FunctionTypeBuild {
        (callDict['addAccessor'] ??= []).push(name);
        return sampleFBuild;
      },
      addInitialSet(name: string, _1: Readonly<string[]>, _2: ObjectType)
        : FunctionTypeBuild
      {
        (callDict['addInitialSet'] ??= []).push(name);
        return sampleFBuild;
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

  const holder =
    <T>(_0: () => ObjectType, whileFn: () => T): T => whileFn();
  const makeContextBuild =
    (callDict: { [name: string]: string[] }, defs: DastDeclarationMap) =>
  ContextBuild.make(
    defs,
    turnIntoFTypeBuild,
    holder,
    makeContextBuilder(callDict)
  );

  function integerFor(name: string): DastNode_ {
    const kMap: { [name: string]: string } = {
      'x': '1',
      'y': '2'
    };
    return makeInteger(kMap[name] ?? (() => { throw new Error(`Unknown name ${name}`); })());
  }

  function singleFor(name: string, functionKind: ContextFunctionGroup): DastDeclarationMap {
    const value = integerFor(name);
    const dependeeNames: string[] = [];
    const rv: WritableDastDeclarationMap = {
      [FunctionNamingSchema.mapToFringeAccessor(name)]: {
        value,
        accessor: { variableName: name },
      },
      [FunctionNamingSchema.mapToInitialSetName(name)]: {
        value,
        initialSet: { variableNames: [name], dependeeNames },
      }
    };
    if (functionKind === 'assignment') {
      rv[FunctionNamingSchema.mapToAssignment(name)] = {
        value,
        assignment: { variableName: name },
        // what happens to this?
        // dependeeNames
      };
    }
    return rv;
  }

  function makeContextBuildWithSingleX
    (operator: ContextFunctionGroup, callDict: { [name: string]: string[] })
  {
    return makeContextBuild(callDict, singleFor('x', operator));
  }

  function makeValidPair(operator: ContextFunctionGroup): DastDeclarationMap {
    const pair = makePair('1', '2');
    const forX = DastTuple.detuplify(pair)![0];
    const forY = DastTuple.detuplify(pair)![1];
    const rv: WritableDastDeclarationMap = {};
    const pairNames = ['x', 'y'];
    rv[FunctionNamingSchema.mapToInitialSetName(pairNames)] = {
      value: pair,
      initialSet: { variableNames: pairNames, dependeeNames: [] },
    };
    ([
      ['x', forX],
      ['y', forY]
    ] as [string, DastNode_][]).forEach(([name, node]) => {
      rv[FunctionNamingSchema.mapToFringeAccessor(name)] = {
        value: node,
        accessor: { variableName: name },
        // dependeeNames: []
      };

      if (operator === 'assignment') {
        rv[`${name}:=`] = {
          value: node,
          assignment: { variableName: name },
          // ??
          // dependeeNames: []
        };
      }
    });
    return rv;
  }

  describe('handling of assignments', () => {
    it('defines a modifier, accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX('assignment', callDict);

      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x:='],
        addAccessor: ['.x'],
        addInitialSet: ['<initSet>:(x)']
      });
    });

    it('defines functions for mutliple variables', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, {
        ...singleFor('x', 'assignment'),
        ...singleFor('y', 'assignment')
      });
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x:=', 'y:='],
        addAccessor: ['.x', '.y'],
        addInitialSet: ['<initSet>:(x)', '<initSet>:(y)']
      });
    });

    it('defines functions for tuple named definitions', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, 
        makeValidPair('assignment')
      );
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addModifier: ['x:=', 'y:='],
        addAccessor: ['.x', '.y'],
        addInitialSet: ['<initSet>:(x,y)']
      });
    });

    it('fails if tuple type does not match names', () => {
      const defs = freeze({
        [FunctionNamingSchema.mapToInitialSetName('t')]:
          {
            value: makePair('1', '2'),
            initialSet:
              {
                variableNames: ['x', 'y', 'z'],
                dependeeNames: []
              }
          }
      });
      const contextBuild = ContextBuild.make(defs, turnIntoFTypeBuild, holder);
      const result = contextBuild.contextType();
      expect(result).toBeUndefined();
      expect(contextBuild.error().message).
        toEqual('Given tuple type is 2 parameter(s), but got 3 name(s)');
    });
  });

  describe('handling of "=" operator', () => {
    it('defines a accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX('accessor', callDict);

      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addAccessor: ['.x'],
        addInitialSet: ['<initSet>:(x)']
      });
    });

    it('defines tuple named definitions', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuild(callDict, 
        makeValidPair('accessor')
      );
      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addAccessor: ['.x', '.y'],
        addInitialSet: ['<initSet>:(x,y)']
      });
    });
  });
});
