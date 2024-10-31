// fn -> new line -> close at star
// fn -> some expression -> close at new line
// fn -> some expression -> EoI -> error
// must be able to handle nested cases
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';

const { freeze, memoize } = Helpers;

const FnClosePositionRetrieval = freeze({
  make: (mTokenRange: TokenRange, _mGroupOpen: Token) => {
    const { error } = StandardError.make();
    const { start, end } = mTokenRange;
    const newLineAt = memoize(() => {
      for (let i = start(); i < end(); ++i) {
        if (mTokenRange.tokenAt(i).type() === Token.types.newLine) {
          return i;
        }
      }
      return undefined;
    });
    const nextFn = () => {

    };
    const closeAtNewLine = () => start() + 1 === newLineAt();
    
    return freeze({
      closePosition() {
        for (let i = start(); i < end(); ++i) {
          
        }
      },
      error
    })
  }
});