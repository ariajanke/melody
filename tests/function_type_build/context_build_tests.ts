import { CodeWriter } from '../../src/code_writer';
import { DastDeclarationMap, WritableDastDeclarationMap } from '../../src/dast_build';
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
      addInitialSet(name: string, _1: Readonly<string[]>, _2: ObjectType)
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
    (callDict: { [name: string]: string[] }, defs: DastDeclarationMap) =>
  ContextBuild.make(
    defs,
    turnIntoFTypeBuild,
    <T>(_0: () => ObjectType, whileFn: () => T): T => whileFn(),
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
        functionKind: 'accessor',
        dependeeNames
      },
      [FunctionNamingSchema.mapToInitialSetName(name)]: {
        value,
        functionKind: 'initialSet',
        variableNames: [name],
        dependeeNames
      }
    };
    if (functionKind === 'assignment') {
      rv[FunctionNamingSchema.mapToAssignment(name)] = {
        value,
        functionKind: 'assignment',
        dependeeNames
      };
    }
    return rv;
  }

  // function singleX(functionKind: ContextFunctionGroup): DastDeclarationMap {
  //   const value = makeInteger('1');
  //   const dependeeNames: string[] = [];
  //   const rv: WritableDastDeclarationMap = {
  //     // I hate this :(
  //     // but we need a structure that is easy to process
  //     '.x': {
  //       // dependeeNames,
  //       value,
  //       functionKind: 'accessor'
  //     },
  //     '<initSet>:(x)': {
  //       dependeeNames,
  //       value,
  //       functionKind: 'initialSet',
  //       variableNames: ['x']
  //     },
  //   };
  //   if (functionKind === 'assignment') {
  //     rv['x:='] = {
  //       // dependeeNames,
  //       value,
  //       functionKind: 'assignment'
  //     };
  //   }
  //   return rv;
  //   // return {
  //   //   name: 'x',
  //   //   operator,
  //   //   value: makeInteger('1'),
  //   //   dependeeNames: []
  //   // };
  // }

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
    ([
      ['x', forX],
      ['y', forY]
    ] as [string, DastNode_][]).forEach(([name, node]) => {
      rv[FunctionNamingSchema.mapToFringeAccessor(name)] = {
        value: node,
        functionKind: 'accessor',
        dependeeNames: []
      };
      rv[FunctionNamingSchema.mapToInitialSetName(name)] = {
        value: node,
        functionKind: 'initialSet',
        variableNames: [name],
        dependeeNames: []
      };
      if (operator === 'assignment') {
        rv[`${name}:=`] = {
          value: node,
          functionKind: 'assignment',
          dependeeNames: []
        };
      }
    });
    return rv;
    // return {
    //   names: ['x', 'y'],
    //   operator,
    //   value: makePair('1', '2'),
    //   dependeeNames: []
    // };
  }

  describe('handling of assignments', () => {
    it('defines a modifier, accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX('assignment', callDict);

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
      const contextBuild = makeContextBuild(callDict, {
        ...singleFor('x', 'assignment'),
        ...singleFor('y', 'assignment')
        // {
        //   name: 'y',
        //   operator: ':=',
        //   value: makeInteger('1'),
        //   dependeeNames: []
        // }
      });
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
      const contextBuild = makeContextBuild(callDict, 
        makeValidPair('assignment')
      );
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
      const contextBuild = makeContextBuild(callDict, {
        [FunctionNamingSchema.mapToInitialSetName('t')]: 
          {
            functionKind: 'initialSet',
            value: makePair('1', '2'),
            variableNames: ['x', 'y', 'z'],
            dependeeNames: []
          }
      });
      const result = contextBuild.contextType();
      expect(result).toBeUndefined();
      expect(contextBuild.error().message).
        toEqual('Expected tuple type of 1 element(s) for names');
    });
  });

  describe('handling of "=" operator', () => {
    it('defines a accessor, and initial set', () => {
      const callDict: { [name: string]: string[] } = {};
      const contextBuild = makeContextBuildWithSingleX('accessor', callDict);

      contextBuild.contextType();
      expect(callDict).toEqual({
        addDirectLookUp: ['puts'],
        addAccessor: ['x'],
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
