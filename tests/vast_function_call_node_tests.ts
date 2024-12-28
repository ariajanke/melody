import { TestHelpers } from './test_helpers';
import { VariableDeclaration } from '../src/variable_declaration';
import { StringPool } from '../src/string_pool';
import { BuiltInFunction, CallingContext } from '../src/function_type';
import { IntegerType } from '../src/integer_type';
import { VastIdentifierNode } from '../src/vast_node';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { Helpers } from '../src/helpers';
import { VastFunctionCallNode } from '../src/vast_function_call_node';
import { VastIntegerLiteralNode } from '../src/vast_literal_node';
import { PutsPrinterType } from '../src/puts_function_look_up_table';
import { type CodeWriter } from '../src/code_writer';

const { freeze, presenceAsserted, memoize } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ VastFunctionCallNode }, () => {
  function makeGenericFuncCall() {
    const intType = IntegerType.instance();
    const funcLookUp = presenceAsserted(() => PutsPrinterType.make().lookUp('puts'));
    const idNode = VastIdentifierNode.make(funcLookUp());
    const funcType = presenceAsserted(() => funcLookUp().byParameters(intType));
    return VastFunctionCallNode.make(funcType(), idNode, VastIntegerLiteralNode.make(intType, 3));
  }

  it('gives control of what defines current context to individual functions', () => {
    const intType = IntegerType.instance();
    const cvar = VariableDeclaration.make('a', intType, ':=');
    const integerLit = VastIntegerLiteralNode.make(intType, 3);
    const cvarLookUp = presenceAsserted(memoize(() => cvar.lookUp('a') ));
    const cvarSetFunc = presenceAsserted(() => cvarLookUp().byParameters(intType));
    const funcCall = VastFunctionCallNode.
      make(cvarSetFunc(), VastIdentifierNode.make( cvarLookUp() ), integerLit );
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

    funcCall.functionType().onBuiltIn((bif: BuiltInFunction) => {
      bif(CallingContext.canTakeNothing(), writer);
    });
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
});
