import { Helpers, raise } from './helpers';

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

function mapToInternalName(name: string): string {
  if (name[0] === '<' || name.endsWith('>')) {
    raise(`Unexpected internal name "${name}"`);
  }
  return `<${name}>`;
}

const kAssignmentOperator = ':=';

export type ContextFunctionGroup = 'initialSet' | 'assignment' | 'accessor';
// starting to get fat
export const FunctionNamingSchema = freeze({
  kAssignmentOperator,
  kEqualityOperator: '=',
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
