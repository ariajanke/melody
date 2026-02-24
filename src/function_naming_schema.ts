import { Helpers } from './helpers';

const { freeze } = Helpers;

const kInitialSetNamePrefix = '<initSet>:';

function mapToInitialSetName(names: string | readonly string[]): string {
  if (typeof names === 'string') {
    return `${kInitialSetNamePrefix}(${names})`;
  }
  return mapToInitialSetName(names.join(','));
}

const kAssignmentOperator = ':=';

export const FunctionNamingSchema = freeze({
  kAssignmentOperator,
  mapToInitialSetName,
  mapToAssignment: (name: string): string =>
    `${name}${kAssignmentOperator}`,
  mapToFringeAccessor: (name: string) => `.${name}`,
  isAnInitialSetName: (name: string): boolean =>
    name.indexOf(kInitialSetNamePrefix) === 0
});
