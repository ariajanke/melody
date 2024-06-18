import { Helpers, StandardError } from '../helpers';
import { BuildSink, type TreePartBuild } from './tree_part_build';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { AstIncompleteUnaryNode } from '../ast_let_declaration_node';
import { ContinuingAfterFringeBuild } from './continuing_after_fringe_build';
import { BuildStateAddition } from './tree_part_build';
import { AstFringeNode } from '../ast_fringe_node';

// follows an operator
export const StartUnaryOperatorBuild = (() => {
  const { freeze } = Helpers;
  const kTokenTypes = Token.types;

  return freeze({
    make: (mTokenRange: TokenRange,
           mOperatorToken: Token): TreePartBuild =>
    {
      const { error, setErrorMessage } = StandardError.make();
      const { startToken, range } = mTokenRange;
      
      function switchToFringe(): BuildStateAddition | undefined {
        const startNode_ = AstFringeNode.makeForToken(startToken());
        const nextRange  = mTokenRange.step();
        const incompleteNode = AstIncompleteUnaryNode.
          makeForOperator(mOperatorToken.content());
        const part = ContinuingAfterFringeBuild.
          make(nextRange, startNode_, incompleteNode);
        return BuildStateAddition.make((sink: BuildSink) => { 
          sink.pushPart(part);
        });
      }

      const kTokenTypeHandlers = freeze({
        [kTokenTypes.identifier    ]: switchToFringe,
        [kTokenTypes.stringLiteral ]: switchToFringe,
        [kTokenTypes.integerLiteral]: switchToFringe,
        [kTokenTypes.grouping      ]: () =>
          setErrorMessage(`Cannot start group after an unary operator (yet!)`),
        [kTokenTypes.operator      ]: () =>
          setErrorMessage(`An operator cannot follow another`),
        [kTokenTypes.newLine       ]: () => {
          mTokenRange.skipNewLine();
          return inst.build();
        }
      });
  
      const inst = freeze({
        build: (): BuildStateAddition | undefined => {
          if (mTokenRange.isEmpty()) {
            return setErrorMessage('unexpected end of input');
          }
  
          return kTokenTypeHandlers[startToken().type()]();
        },
        error,
        range
      });
      return inst;
    }
  });
})();
