import { Helpers } from './helpers';

const { freeze } = Helpers;

const kInitialSetNamePrefix = '<initSet>:';

function mapToInitialSetName(names: string | readonly string[]): string {  
  if (typeof names === 'string') {
    if (names.indexOf(kInitialSetNamePrefix) === 0) {
      throw new Error(`Unexpected initial set name "${names}"`);
    }
    return `${kInitialSetNamePrefix}(${names})`;
  }
  return mapToInitialSetName(names.join(','));
}

const kAssignmentOperator = ':=';

export type ContextFunctionGroup = 'initialSet' | 'assignment' | 'accessor';

export const FunctionNamingSchema = freeze({
  kAssignmentOperator,
  kEqualityOperator: '=',
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
