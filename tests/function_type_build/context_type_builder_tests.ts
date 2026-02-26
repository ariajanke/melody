import { CodeWriter } from '../../src/code_writer';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../../src/function_type_build';
import { ConstantStringType, IntegerType } from '../../src/function_type_build/builtin_type';
import { ContextTypeBuilder } from '../../src/function_type_build/context_type_builder';
import { PutsFunctionLookUpTable } from '../../src/function_type_build/puts_function_look_up_table';
import { TupleObjectFactory } from '../../src/function_type_build/tuple_type';
import { Helpers } from '../../src/helpers';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;
const { freeze, memoize } = Helpers;

describeNamed({ ContextTypeBuilder }, () => {
  function makeTestWriter(calls: string[]): CodeWriter {
    const methodNames = [
      'addIntegers',
      'askInteger',
      'askString',
      'printString',
      'printInteger',
      'drop',
      'multiplyIntegers',
      'subtractIntegers'
    ] as const satisfies (keyof CodeWriter)[];

    const numMethodNames = [
      'indirectCall',
      'loadInteger',
      'pushRepresentation',
      'storeInteger'
    ] as const satisfies (keyof CodeWriter)[];
    
    const writer: CodeWriter = freeze(
      Object.assign(
      {},
      ...methodNames.map(name =>
        ({ [name]: (): CodeWriter => { calls.push(name); return writer; } })),
      ...numMethodNames.map(name =>
        ({ [name]: (_0: number): CodeWriter => { calls.push(name); return writer; } }))
      )
    ) as CodeWriter;

    return writer;
  }

  function collectCallsForFunctionType(ftype: FunctionType): string[] {
    const calls: string[] = [];
    const writer = makeTestWriter(calls);
    ftype.emit(writer);
    return calls;
  }

  const integerType = IntegerType.instance;
  const stringType = ConstantStringType.instance;

  const integerPairType = memoize(() =>
    TupleObjectFactory.make([integerType(), integerType()]));

  const { mapToInitialSetName, mapToFringeAccessor, mapToAssignment } =
    FunctionNamingSchema;

  const { emptyTuple } = TupleObjectFactory;

  function assertFunctionBuild(fbuild: FunctionTypeBuild): FunctionType {
    const ftype = fbuild.functionType();
    if (!ftype) {
      throw new Error(`Failed to create function type: ${fbuild.error().message}`);
    }
    return ftype;
  }

  function addAccessorFor
    (builder: ContextTypeBuilder, name: string, type: ObjectType): FunctionType
  {
    return assertFunctionBuild(builder.
      addAccessor(mapToFringeAccessor(name), { variableName: name }, type));
  }

  function addModifierFor
    (builder: ContextTypeBuilder, name: string, type: ObjectType): FunctionType
  {
    return assertFunctionBuild(builder.
      addModifier(mapToAssignment(name), { variableName: name }, type));
  }

  describe('addModifier', () => {
    it('creates function with taking and returning an integer', () => {
      const builder = ContextTypeBuilder.make();
      const ftype = addModifierFor(builder, 'a', integerType());

      expect(ftype.parameters().uid()).toEqual(integerType().uid());
      expect(ftype.returns().uid()).toEqual(integerType().uid());
    });

    it('emits correct instructions', () => {
      const builder = ContextTypeBuilder.make();
      const ftype = addModifierFor(builder, 'a', integerType());
      const recordedCalls = collectCallsForFunctionType(ftype);

      expect(recordedCalls).toEqual([
        'storeInteger',
        'drop', // drops receiver
        'loadInteger'
      ]);
    });
  });

  describe('addAccessor', () => {
    it('creates function taking nothing, returning an integer', () => {
      const builder = ContextTypeBuilder.make();
      const ftype = addAccessorFor(builder, 'a', integerType());

      expect(ftype.parameters().uid()).toEqual(emptyTuple().uid());
      expect(ftype.returns().uid()).toEqual(integerType().uid());
    });

    it('emits correct instructions', () => {
      const builder = ContextTypeBuilder.make();
      const ftype = addAccessorFor(builder, 'a', integerType());
      const recordedCalls = collectCallsForFunctionType(ftype);

      expect(recordedCalls).toEqual(['loadInteger']);
    });
  });
  
  describe('addInitialSet', () => {
    function createSampleTupleFunctionBuild(names = ['a', 'b']): FunctionTypeBuild {
      const builder = ContextTypeBuilder.make();
      const tupleType = integerPairType();
      return builder.addInitialSet(mapToInitialSetName(names), names, tupleType);
    }
    
    function createSampleTupleFunctionType(): FunctionType {
      const fbuild = createSampleTupleFunctionBuild();
      return fbuild.functionType()!;
    }

    it('creates function taking an integer, returning nothing', () => {
      const builder = ContextTypeBuilder.make();
      const fbuild = builder.addInitialSet('<initSet>:(a)', ['a'], integerType());
      const ftype = fbuild.functionType()!;

      expect(ftype.parameters().uid()).toEqual(integerType().uid());
      expect(ftype.returns().uid()).toEqual(emptyTuple().uid());
    });
    
    it('creates function taking a tuple, returning nothing', () => {
      const ftype = createSampleTupleFunctionType();

      expect(ftype.parameters().uid()).toEqual(integerPairType().uid());
      expect(ftype.returns().uid()).toEqual(emptyTuple().uid());
    });

    it('creates function for tuple, emitting correct instructions', () => {
      const ftype = createSampleTupleFunctionType();
      const recordedCalls = collectCallsForFunctionType(ftype);

      expect(recordedCalls).toEqual(['storeInteger', 'storeInteger']);
    });

    it('fails to create function for uneven tuple', () => {
      const fbuild = createSampleTupleFunctionBuild(['a', 'b', 'c']);
      expect(fbuild.functionType()).toBeUndefined();
      expect(fbuild.error().message).
        toEqual('Given tuple type is 2 parameter(s), but got 3 name(s)');
    });
  });

  // An important observation about DAST nodes
  // Call nodes, specifically named ones (e.g. "a()") get sent to the
  // context receiver. So, much like "puts" we will need a utility to
  // add functions in the general case

  describe('addDirectLookUp', () => {
    function contextTypeWithPuts(): ObjectType {
      const builder = ContextTypeBuilder.make().
        addDirectLookUp('puts', PutsFunctionLookUpTable.make());
      return builder.objectType();
    }
    function addAndLookUpPuts() {
      const contextType = contextTypeWithPuts();
      return contextType.lookUp('puts');
    }

    it('adds puts to look up table', () => {
      const lookUpTable = addAndLookUpPuts();
      expect(lookUpTable).toBeDefined();
      expect(lookUpTable!.byParameters(integerType())).toBeDefined();
    });

    ([
      [stringType(), ['printString', 'drop']],
      [integerPairType(), ['printInteger', 'printInteger', 'drop']],
      [
        TupleObjectFactory.make([stringType(), integerType()]),
        ['printString', 'printInteger', 'drop']
      ]

    ] as [ObjectType, string[]][]).forEach(([type, expectedCalls]) => {
      it(`for "${type.name()}", adds puts`, () => {
        const lookUpTable = addAndLookUpPuts();
        expect(lookUpTable!.byParameters(type)).toBeDefined();
      });

      it(`for "${type.name()}", emits correct instructions`, () => {
        const lookUpTable = addAndLookUpPuts();
        const putsFunction = lookUpTable!.byParameters(type);
        const recordedCalls = collectCallsForFunctionType(putsFunction!);
        expect(recordedCalls).toEqual(expectedCalls);
      });
    });

    it('for an arbitrary name, successfully add look up', () => {
      const foundFType = memoize((): FunctionType => freeze({
          parameters: () => emptyTuple(),
          returns: () => integerType(),
          emit: (cw: CodeWriter) => cw,
          uid: memoize(Symbol)
      }));
      const builder = ContextTypeBuilder.make();
      const table = freeze({
        byParameters: (_0: ObjectType): FunctionType | undefined => 
          foundFType()
      });
      builder.addDirectLookUp('a', table);
      const lookUpTable = builder.objectType().lookUp('a');
      expect(lookUpTable).toBeDefined();
      const ftype = lookUpTable!.byParameters(emptyTuple());
      expect(ftype).toBeDefined();
      expect(ftype!.returns().uid()).toEqual(integerType().uid());
    });

    it('for unsupported type, does not add puts', () => {
      const contextType = contextTypeWithPuts();
      const lookUpTable = contextType.lookUp('puts');
      expect(lookUpTable).toBeDefined();
      const putsFunction = lookUpTable!.byParameters(contextType);
      expect(putsFunction).toBeUndefined();
    });
  });

  describe('objectType', () => {
    const testFunctionName = 'a';

    function lookUpOnObject(builder: ContextTypeBuilder, mappedName: string) {
      const contextType = builder.objectType();
      const lookUpTable = contextType.lookUp(mappedName);
      expect(lookUpTable).toBeDefined();
      return lookUpTable!;
    }

    it('tallies size in bytes correctly', () => {
      const builder = ContextTypeBuilder.make();
      addModifierFor(builder, 'a', integerType());
      addModifierFor(builder, 'b', integerType());

      const contextType = builder.objectType();
      expect(contextType.sizeInBytes()).toEqual(8);
    });

    it('has correct look up name for modifier', () => {
      const builder = ContextTypeBuilder.make();
      addModifierFor(builder, testFunctionName, integerType());

      const lookUpTable =
        lookUpOnObject(builder, mapToAssignment(testFunctionName));      
      expect(lookUpTable).toBeDefined();
      expect(lookUpTable!.byParameters(integerType())).toBeDefined();
    });

    it('has correct look up name for accessor', () => {
      const builder = ContextTypeBuilder.make();
      addAccessorFor(builder, testFunctionName, integerType());

      const lookUpTable = 
        lookUpOnObject(builder, mapToFringeAccessor(testFunctionName));
      expect(lookUpTable).toBeDefined();
      expect(lookUpTable!.byParameters(TupleObjectFactory.emptyTuple())).toBeDefined();
    });

    it('has correct look up name for single initial set', () => {
      const builder = ContextTypeBuilder.make();
      builder.
        addInitialSet(mapToInitialSetName(testFunctionName),
                      [testFunctionName],
                      integerType());

      const lookUpTable =
        lookUpOnObject(builder, mapToInitialSetName(testFunctionName)); 
      expect(lookUpTable).toBeDefined();
      expect(lookUpTable!.byParameters(integerType())).toBeDefined();
    });

    it('has correct look up name for tuple initial set', () => {
      const builder = ContextTypeBuilder.make();
      const names = ['a', 'b'];
      builder.
        addInitialSet(mapToInitialSetName(names),
                      names,
                      integerPairType());

      const lookUpTable =
        lookUpOnObject(builder, mapToInitialSetName(['a', 'b'])); 
      expect(lookUpTable).toBeDefined();
      expect(lookUpTable!.byParameters(integerPairType())).toBeDefined();
    });
  });
});
