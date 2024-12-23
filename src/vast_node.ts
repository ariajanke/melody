import { FunctionLookUpTable } from './function_look_up_table';
import { FunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

export interface VastNode {
  objectType(): ObjectType,
  functionType(): FunctionType,
  itCanBe(ability: (() => symbol)): boolean,
  uid(): symbol
}

// each will have:
// - a context
export const VastNode = freeze({
  ableToBe: {
    evaluated: memoize(Symbol)
    // KEEP: reserved for resolved
    // KEEP: reserved for discovered
  },
  itCanBe(...abilities: (() => symbol)[]): (fn: () => symbol) => boolean {
    return (fn: () => symbol) =>
      abilities.findIndex((can: () => symbol) => can() === fn()) > -1;
  }
});

export const VastIdentifierNode = freeze({
  hasGetter(tbl: FunctionLookUpTable) {
    return !!tbl.byParameters(ObjectType.emptyTupleInstance());
  },
  make(mDefinedBy: FunctionLookUpTable) {
    const { itCanBe } = VastNode;
    if (!this.hasGetter(mDefinedBy)) {
      throw new Error('Must check if getter exist');
    }
    const mGetter = mDefinedBy.byParameters(ObjectType.emptyTupleInstance()) as FunctionType;
    return freeze({
      objectType: () => mGetter.returns(),
      functionType: () => mGetter as FunctionType,
      itCanBe: itCanBe(),
      uid: memoize(Symbol)
    }) satisfies VastNode;
  }
});
