import { Helpers, StandardErrorMessage } from '../helpers';

const { freeze } = Helpers;

export interface ErrorsCollector {
  pushErrors(errors: Readonly<StandardErrorMessage[]>): void;
  pushError(error: StandardErrorMessage): void;
  errors(): Readonly<StandardErrorMessage[]>;
};

export const ErrorsCollector = freeze({
  make() {
    const mErrors: StandardErrorMessage[] = [];
    return freeze({
      pushErrors(errors: Readonly<StandardErrorMessage[]>)
        { mErrors.push(...errors); },
      pushError(error: StandardErrorMessage)
        { mErrors.push(error); },
      errors(): Readonly<StandardErrorMessage[]>
        { return mErrors; }
    });
  }
});
