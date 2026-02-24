import { DastNode } from '../dast_build';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface CarriedNamesRegistry {
  register(node: DastNode, carriedNames: Readonly<Set<string>>): void;
  lookup(node: DastNode): Readonly<Set<string>> | undefined;
};

function make(): CarriedNamesRegistry {
  const mMap: { [uid: number]: Readonly<Set<string>> | undefined } = {};

  return freeze({
    register(node: DastNode, carriedNames: Readonly<Set<string>>) {
      mMap[node.uid()] = carriedNames;
    },
    lookup(node: DastNode): Readonly<Set<string>> | undefined {
      return mMap[node.uid()];
    }
  });
}

export const CarriedNamesRegistry = freeze({ make });
