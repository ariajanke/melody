import { FunctionType } from '../function_type_build';
import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

// NOTE this is a dependancy of emission
export interface FunctionDefinitionRegistry_ {
  registerDefinitionBody(ftype: FunctionType, depth: number): void;
  rootDefinition(): FunctionType;
  orderedDefinitions(): Readonly<FunctionType[]>;
}

// OrderedWasmCodeThing;

// take registered definition bodies, in some (root, ...) order
// OrderedWasmCodeThing takes def bodies,
//   then assign an index to each (enable emission),
//   then enforce which order they're added to the code section
//   with that enforced order, then emit them (do the emission)

function make() {
  const mUids: { [uid: symbol]: FunctionType } = {};
  const mOrderedDefinitions: (FunctionType | undefined)[] = [];
  let mRootFtype: FunctionType | undefined = undefined;
  function registerDefinitionBody(ftype: FunctionType, depth: number) {
    if (mUids[ftype.uid()]) {
      raise('May not register a function more than once.');
    }
    mUids[ftype.uid()] = ftype;

    if (depth === 0) {
      mRootFtype = ftype;
    }
    mOrderedDefinitions.push(ftype);
  }

  const rootDefinition = () =>
    mRootFtype ?? raise('no root registered');

  const orderedDefinitions = () => mOrderedDefinitions;

  return freeze({ registerDefinitionBody, rootDefinition, orderedDefinitions });
}

export const FunctionDefinitionRegistry_ = freeze({ make });
