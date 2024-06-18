
import { Helpers } from '../helpers';
import { TokenRange } from '../token_range';
import { Token } from '../token';
import { StandardError } from '../helpers';

const { freeze, memoize } = Helpers;

const kCloseMapping = freeze({
  ['(']: ')'
});

export const ClosePositionRetrieval = (() => {

  return freeze({
    make: (mTokenRange: TokenRange, mGroupOpen: Token) => {
      const { error, setErrorMessage } = StandardError.make();
      const { tokenAt, start, end } = mTokenRange;

      const closeMapping = () => {
        const { content } = mGroupOpen;
        return kCloseMapping[content()] ?? (() => {
          throw Error(`Unhandled opening "${content()}"`);
        });
      };

      return freeze({
        closePosition: memoize(() => {
          const closeStr = closeMapping(); 
          const count: number = end();
          for (let i = start(); i < count; ++i) {
            if (tokenAt(i).content() === closeStr) {
              return i;
            }
          }

          return setErrorMessage(
            `Cannot find close position for ${mGroupOpen.content()}`);
        }),
        error
      });
    }
  });
})();
