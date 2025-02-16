import { FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { FunctionAbility } from './function_ability';

const { freeze, memoize } = Helpers;

export interface VastNode {
  functionType(): FunctionType,
  itCanBe(): FunctionAbility,
  uid(): symbol,
  decompose(): Readonly<VastNode[]>
}

export const VastNode = freeze({
  // TODO move this somewhere else
  forTesting: {
    knowableLaterNode: memoize((): VastNode => {
      const inst = freeze({
        // objectType: IntegerType.instance,
        functionType: () => IncompleteFunctionType.make().
          implementationDoesNothing().
          finish(),
        itCanBe: FunctionAbility.isKnownableLater,
        uid: memoize(Symbol),
        decompose: () => [inst]
      });
      return inst;
    })
  }
});

export const VastIdentifierNode = freeze({
  make(mDefinedBy: FunctionType) {
    const inst = freeze({
      functionType: () => mDefinedBy,
      itCanBe: () => mDefinedBy.ability(),
      uid: memoize(Symbol),
      decompose: () => [inst]
    });
    return inst satisfies VastNode;
  }
});
