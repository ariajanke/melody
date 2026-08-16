import { Helpers, raise, InternalNaming } from './helpers';
import { OperatorNamingSchema } from './operator_naming_schema';

const { freeze } = Helpers;

const kInitialSetNamePrefix = '<initSet>:';

function mapToInitialSetName(names: string | readonly string[]): string {  
  if (typeof names === 'string') {
    if (names.indexOf(kInitialSetNamePrefix) === 0) {
      raise(`Unexpected initial set name "${names}"`);
    }
    return `${kInitialSetNamePrefix}(${names})`;
  }
  return mapToInitialSetName(names.join(','));
}

const { mapToInternalName } = InternalNaming;
const kAssignmentOperator = OperatorNamingSchema.kAssignment;

export type ContextFunctionGroup = 'initialSet' | 'assignment' | 'accessor';

export const FunctionNamingSchema = freeze({
  kContextName: mapToInternalName('context'),
  kParentName: mapToInternalName('parent'),
  kNoneName: mapToInternalName('none'),
  uniqueFrameNameFor(n: number): string { return mapToInternalName(`frame:${n}`); },
  mapToInternalName,
  mapToInitialSetName,
  mapFromFringeAccessor: (name: string): string | undefined =>
    name[0] === '.' ? name.slice(1) : undefined,
  mapToAssignment: (name: string): string =>
    `${name}${kAssignmentOperator}`,
  mapToFringeAccessor: (name: string) => `.${name}`,
  isAnInitialSetName: (name: string): boolean =>
    name.indexOf(kInitialSetNamePrefix) === 0,
  isAnAssignmentName: (name: string): boolean =>
    name.endsWith(kAssignmentOperator),
  isAFringeAccessorName: (name: string): boolean =>
    name[0] === '.' && !name.endsWith(kAssignmentOperator)
});
