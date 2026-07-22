import { CodeWriter } from '../../src/code_writer';
import { DastNode, DastVisitor } from '../../src/dast_build';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { FunctionLookUpTable, FunctionTypeBuild, ObjectType } from '../../src/function_type_build';
import { BuiltinTypeBase, IntegerType } from '../../src/function_type_build/builtin_type';
import { CallFunctionTypeBuild } from '../../src/function_type_build/call_function_build';
import { FunctionTypeBase } from '../../src/function_type_build/function_type_base';
import { TupleObjectFactory } from '../../src/function_type_build/tuple_type';
import { Helpers, raise, StandardError } from '../../src/helpers';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;
const { freeze, memoize, makeCounter } = Helpers;

type TestMapping = { [uid: number]: FunctionTypeBuild };

const DastNodeMaker = (() => {
  const counter = makeCounter();
  return freeze({
    make(mEmitNames: string[] = []) {
      const mapping: TestMapping = {};
      function makeSampleDastNode
        (rep: string,
         parameters: ObjectType,
         returns: ObjectType,
         emissions: number)
        : DastNode
      {
        const inst = freeze({
          visit<T>(_0: DastVisitor<T>): T {
            throw new Error("don't call this!");
          },
          asString: () => rep,
          uid: memoize(counter)
        });
        const ftype = freeze({
          ...FunctionTypeBase.receivedByNone(),
          parameters: () => parameters,
          returns: () => returns,
          emit(writter: CodeWriter) {
            mEmitNames.push(rep);
            if (emissions > 0) {
              for (let i = 0; i < emissions; ++i) {
                writter.pushRepresentation(0);
              }
            }
            return writter;
          }
        });
        mapping[inst.uid()] = freeze({
          functionType: () => ftype,
          error: StandardError.make().error
        });
        return inst;
      };
      const intoFunctionTypeBuild = (node: DastNode) =>
        mapping[node.uid()];
      return freeze({ makeSampleDastNode, intoFunctionTypeBuild });
    }
  });
})();

describeNamed({ CallFunctionTypeBuild }, () => {
  const integerType = IntegerType.instance;
  const { emptyTuple } = TupleObjectFactory;

  let makeSampleDastNode_ =
    (_0: string, _1: ObjectType, _2: ObjectType, _3: number): DastNode =>
    { throw new Error(`define makeSampleDastNode_`); };
  let receiverLookUp = (_0: string): FunctionLookUpTable | undefined =>
    { throw new Error(`define receiverLookUp`);};
  let callNameStr = (): string => { throw new Error(`define callNameStr`); };
  const receiverType = (): ObjectType => freeze({
    ...BuiltinTypeBase.defaultsWith(receiverType),
    name: () => 'receiver',
    lookUp: (name: string) => receiverLookUp(name),
    sizeInStackItems: () => 0,
    sizeInBytes: () => 0,
    uid: memoize(Symbol),
    stackCleanUp() { throw new Error('write me'); }
  });
  let argsEmissions = (): number =>
    { throw new Error(`define argsEmissions`); };

  const call = () => makeSampleDastNode_(callNameStr(), integerType(), integerType(), 0);
  const receiver = () => makeSampleDastNode_('receiver', emptyTuple(), receiverType(), 0);
  const args = () => makeSampleDastNode_('args', emptyTuple(), integerType(), argsEmissions());
  const makeBuild = (fn: (node: DastNode) => FunctionTypeBuild) =>
    () => CallFunctionTypeBuild.make(call(), receiver(), args(), () => 4, fn);

  const makeSampleLookUpTable =
    (emittedNames: string[], rep: string): FunctionLookUpTable =>
  {
    return freeze({
      byParameters(_0: ObjectType) {
        return freeze({
          ...FunctionTypeBase.receivedByLexical(),
          emit(writer: CodeWriter) {
            emittedNames.push(rep);
            return writer;
          },
        });
      },
      list() { raise('no'); }
    });
  };

  const makeSampleWriter = () => {
    const inst = freeze({
      pushRepresentation(_0: number): CodeWriter { return inst; },
      pushStackPointer() { return inst; },
      addIntegers() { return inst; },
      setStackPointer() { return inst; },
      forStackPointer(_0: 'saveToLocal' | 'restoreToGlobal'): CodeWriter
        { return inst; },
    }) as CodeWriter;
    return inst;
  };

  function successfullyBuildsFtype(setup: () => void) {
    it('successfully builds an ftype', () => {
      setup();
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make();
      const build = makeBuild(intoFunctionTypeBuild);
      makeSampleDastNode_ = makeSampleDastNode;

      const ftype = build().functionType();
      expect(ftype).toBeDefined();
      expect(ftype!.parameters()).toEqual(emptyTuple());
      expect(ftype!.returns()).toEqual(emptyTuple()); 
    });
  }

  function setupForTestCallWith(emittedNames: string[] = []) {
    receiverLookUp = (name: string) => {
      if (name !== callNameStr())
        { return undefined; }
      return makeSampleLookUpTable(emittedNames, name);
    };
    callNameStr = () => 'testCall';
    argsEmissions = () => 0;
  }

  describe('without a function index accessor', () => {
    const setup = setupForTestCallWith;

    successfullyBuildsFtype(setup);

    it('emits instructions in the correct order', () => {
      const emitNames: string[] = [];
      setup(emitNames);
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make(emitNames);
      const build = makeBuild(intoFunctionTypeBuild);
      makeSampleDastNode_ = makeSampleDastNode;

      const { functionType } = build();
      functionType();
      emitNames.length = 0;
      functionType()!.emit(makeSampleWriter());
      expect(emitNames).toEqual(['receiver', 'args', callNameStr()]);
    });
  });

  describe('with a function index accessor', () => {
    const setup = (emittedNames: string[] = []) => {
      receiverLookUp = (name: string) => {
        const asFringe = FunctionNamingSchema.mapToFringeAccessor(callNameStr());
        if (name === asFringe || name === callNameStr()) {
          return makeSampleLookUpTable(emittedNames, name);
        }

        return undefined;        
      };
      callNameStr = () => 'testCall';
      argsEmissions = () => 0;
    };

    successfullyBuildsFtype(setup);

    it('emits instructions in the correct order', () => {
      const emitNames: string[] = [];
      setup(emitNames);
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make(emitNames);
      makeSampleDastNode_ = makeSampleDastNode;
      const build = makeBuild(intoFunctionTypeBuild)();
      expect(build.functionType()).toBeDefined();
      // NOTE functionType will call emits to check stack safety
      emitNames.length = 0;
      build.functionType()!.emit(makeSampleWriter());
      expect(emitNames).toEqual([
        'receiver', 'args', `.${callNameStr()}`, callNameStr()
      ]);
    });
  });

  describe('call not available on receiver', () => {
    const setup = () => {
      receiverLookUp = (_0: string) => undefined;
      callNameStr = () => 'testCall';
      argsEmissions = () => 0;
    };

    const getBuild = () => {
      setup();
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make();
      makeSampleDastNode_ = makeSampleDastNode;
      return makeBuild(intoFunctionTypeBuild)();
    };

    it('should fail build', () => {
      const build = getBuild();
      
      expect(build.functionType()).toBeUndefined();
    });
    
    it('should have an error message about missing call on receiver', () => {
      const build = getBuild();
      build.functionType();

      expect(build.error()).toBeDefined();
      expect(build.error()!.message).toMatch(/cannot find function "testCall" on receiver "receiver"/);
    });
  });

  describe('with ":=" as call name', () => {
    const setup = () => {
      receiverLookUp = (_0: string) => undefined;
      callNameStr = () => ':=';
      argsEmissions = () => 0;
    };

    it('should throw an error when the call name is ":="', () => {
      setup();
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make();
      const build = makeBuild(intoFunctionTypeBuild);
      makeSampleDastNode_ = makeSampleDastNode;

      expect(() => build().functionType()).toThrowError(
        /":=" is not a valid call name, DAST build should have stripped it out and replaced it with the appropriate fringe accessor/
      );
    });
  });

  describe('stack safety checker', () => {
    const setup = () => {
      setupForTestCallWith();
      argsEmissions = () => 1;
    };
    
    it('should throw an error when the stack safety check fails', () => {
      setup();
      const { makeSampleDastNode, intoFunctionTypeBuild } = DastNodeMaker.make();
      const build = makeBuild(intoFunctionTypeBuild);
      makeSampleDastNode_ = makeSampleDastNode;
      const callTypeBuild = build();
      expect(() => callTypeBuild.functionType()).toThrowError(
        /Stack safety check failed: expected 0 items, but got 1*/
      );
    });
  });
});
