import { TestHelpers } from './test_helpers';
import { VariableDeclaration } from '../src/variable_declaration';
import { StringPool } from '../src/string_pool';
import { CallingContext, FunctionType, IncompleteFunctionType } from '../src/function_type';
import { IntegerType } from '../src/integer_type';
import { VastIdentifierNode, VastNode } from '../src/vast_node';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { Helpers } from '../src/helpers';
import { VastFunctionCallNode } from '../src/vast_function_call_node';
import { VastIntegerLiteralNode } from '../src/vast_literal_node';
import { PutsPrinterType } from '../src/puts_function_look_up_table';
import { type CodeWriter } from '../src/code_writer';
import { PersistentStack } from '../src/persistent_stack';
import { ObjectType } from '../src/object_type';
import { FunctionAbility } from '../src/function_ability';

const { freeze, presenceAsserted, memoize } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ VastFunctionCallNode }, () => {
  const { emptyTupleInstance } = ObjectType;

  function makeGenericFuncCall() {
    const intType = IntegerType.instance();
    const funcLookUp = presenceAsserted(() => PutsPrinterType.make().lookUp('puts'));
    const idNode = VastIdentifierNode.make(presenceAsserted(() => funcLookUp().byParameters(emptyTupleInstance()))());
    const funcType = presenceAsserted(() => funcLookUp().byParameters(intType));
    return VastFunctionCallNode.make(funcType(), idNode, VastIntegerLiteralNode.make(intType, 3));
  }
  
  function makeSampleDetails(name: string, operator: string, tuplePosition?: number) {
    const vn: VastNode = freeze({
      itCanBe: FunctionAbility.isKnownableLater,
      uid: memoize(Symbol),
      decompose: () => [vn],
      functionType: memoize(() => IncompleteFunctionType.
        make().
        setParameters(IntegerType.instance()).
        setReturns(IntegerType.instance()).
        // NOTE: not actually valid/good
        implementationDoesNothing().
        finish())
    });
    return freeze({ name, operator, valueNode: vn, tuplePosition });
  }

  it('gives control of what defines current context to individual functions', () => {
    const intType = IntegerType.instance();
    const cvar = VariableDeclaration.make(makeSampleDetails('a', ':='));
    const integerLit = VastIntegerLiteralNode.make(intType, 3);
    const cvarLookUp = presenceAsserted(memoize(() => cvar.lookUp('.a') ));
    const cvarSetFunc = presenceAsserted(() => cvarLookUp().byParameters(intType));
    const funcCall = VastFunctionCallNode.
      make(cvarSetFunc(), VastIdentifierNode.make( presenceAsserted(() => cvarLookUp().byParameters(emptyTupleInstance()))() ), integerLit );
    const pushedInts: number[] = [];
    const writer: CodeWriter = (() => {
      const inst = InterpretedCodeWriter.make(StringPool.makeDefault());
      return freeze({
        ...inst,
        pushRepresentation(n: number) {
          pushedInts.push(n);
          inst.pushRepresentation(n);
          return writer;
        },
      });
    })();

    funcCall.functionType().builtIn()(CallingContext.canTakeNothing(), writer);
    expect(pushedInts).toEqual([3]);
  });

  it('is its function type, but takes no parameters', () => {
    const funcCall = makeGenericFuncCall();
    expect(funcCall.functionType().parameters().decompose()).toEqual([]);
  });

  it('is its function type, returns retained', () => {
    const funcCall = makeGenericFuncCall();
    expect(funcCall.functionType().returns().decompose()).toEqual([]);
  });

  it('will clean up after itself when needed', () => {
    const intType = IntegerType.instance();
    const callNode = VastFunctionCallNode.
      make(intType.lookUp('+')!.byParameters(intType) as FunctionType,
           VastIntegerLiteralNode.make(intType, 5),
           VastIntegerLiteralNode.make(intType, 2));
    const stack = PersistentStack.make<number>(() => Infinity);
    const writer = InterpretedCodeWriter.make(StringPool.makeForStrings(() => ['bees']), {
      ...InterpretedCodeWriter.defaultInjections(),
      makeStack: () => stack
    });
    callNode.functionType().builtIn()(CallingContext.canTakeNothing(), writer);
    expect(stack.count()).toEqual(0);  
  });
});
