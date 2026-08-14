import { BuiltinFunctionNames } from '../../../src/builtin_function_names';
import { FunctionNamingSchema } from '../../../src/function_naming_schema';
import { ContextBaseStage } from '../../../src/function_type_build/context_build';
import { TupleObjectType } from '../../../src/function_type_build/tuple_object_type';
import { TestHelpers } from '../../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ ContextBaseStage }, () => {
  const inst = ContextBaseStage.make();
  const lookUp = inst.referenceType().lookUp;
  const { emptyTuple } = TupleObjectType;

  it('defines builtin function for "SystemIO"', () => {
    expect(lookUp(BuiltinFunctionNames.kSystemIoTable)).toBeDefined();
  });

  it('defines self referential function <context>', () => {
    expect(lookUp(FunctionNamingSchema.kContextName)).toBeDefined();
  });

  it('self referential function is defined correctly', () => {
    const ftype = lookUp(FunctionNamingSchema.kContextName)?.
      byParameters(emptyTuple());
    expect(ftype?.receiver().uid()).toEqual(emptyTuple().uid());
    expect(ftype?.returns().uid()).toEqual(inst.referenceType().uid());
  });
});
