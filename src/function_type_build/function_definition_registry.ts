import { FunctionType } from '../function_type_build';

// NOTE this is a dependancy of emission
interface FunctionDefinitionRegistry {
  registerDefinitionBody(ftype: FunctionType): void;
  rootDefinition(): FunctionType;
  allDefinitions(): Readonly<FunctionType[]>;
}

OrderedWasmCodeThing;

// take registered definition bodies, in some (root, ...) order
// OrderedWasmCodeThing takes def bodies,
//   then assign an index to each (enable emission),
//   then enforce which order they're added to the code section
//   with that enforced order, then add them (do the emission)
