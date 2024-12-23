import { TestHelpers } from './test_helpers';
import { VariableDeclaration } from '../src/variable_declaration_function_table';
import { StringPool } from '../src/string_pool';
import { BuiltInFunction, CallingContext, CodeWriter } from '../src/function_type';
import { IntegerType } from '../src/integer_type';
import { VastIdentifierNode } from '../src/vast_node';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { Helpers } from '../src/helpers';
import { VastFunctionCallNode } from '../src/vast_function_call_node';
import { VastIntegerLiteralNode } from '../src/vast_literal_node';
import { PutsPrinterType } from '../src/puts_function_look_up_table';

const { freeze } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ VastFunctionCallNode }, () => {
  function assertDefined<Type>(thing: Type | undefined, expText?: string) {
    return thing ?? (() => {
      throw new Error(expText ?? 'Failed always defined assertion');
    })();
  }

  function makeGenericFuncCall() {
    const intType = IntegerType.instance();
    const funcLookUp = assertDefined(PutsPrinterType.make().lookUp('puts'));
    const idNode = VastIdentifierNode.make(funcLookUp);
    const funcType = assertDefined(funcLookUp.byParameters(intType));
    return VastFunctionCallNode.make(funcType, idNode, VastIntegerLiteralNode.make(intType, 3));
  }

  it('gives control of what defines current context to individual functions', () => {
    const intType = IntegerType.instance();
    const cvar = VariableDeclaration.make('a', intType, ':=');
    const integerLit = VastIntegerLiteralNode.make(intType, 3);
    const cvarLookUp = assertDefined( cvar.lookUp('a') );
    const cvarSetFunc = assertDefined(cvarLookUp.byParameters(intType));
    const funcCall = VastFunctionCallNode.
      make(cvarSetFunc, VastIdentifierNode.make( cvarLookUp ), integerLit );
    const pushedInts: number[] = [];
    const writer: CodeWriter = (() => {
      const inst = InterpretedCodeWriter.make(StringPool.makeDefault());
      return freeze({
        ...inst,
        pushInteger(n: number) {
          pushedInts.push(n);
          inst.pushInteger(n);
          return writer;
        },
      });
    })();

    funcCall.functionType().onBuiltIn((bif: BuiltInFunction) => {
      bif(CallingContext.canTakeNothing(), writer);
    });
    expect(pushedInts).toEqual([3, 0]);
  });

  it('is its function type, but takes no parameters', () => {
    const funcCall = makeGenericFuncCall();
    expect(funcCall.functionType().parameters().decompose()).toEqual([]);
  });

  it('is its function type, returns retained', () => {
    const funcCall = makeGenericFuncCall();
    expect(funcCall.functionType().returns().decompose()).toEqual([]);
  });
});
