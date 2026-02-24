import { FunctionType } from './function_type_build';
import { Helpers, raise } from './helpers';

const { freeze } = Helpers;

export interface FunctionDefinitionRegistry {
  registerDefinitionBody(ftype: FunctionType, depth: number): void;
  rootDefinition(): FunctionType;
  orderedDefinitions(): Readonly<FunctionType[]>;
}

function make(): FunctionDefinitionRegistry {
  const mUids: { [uid: symbol]: FunctionType } = {};
  const mOrderedDefinitions: FunctionType[] = [];
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

export const FunctionDefinitionRegistry = freeze({ make });
