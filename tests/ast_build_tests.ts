import { AstBuild } from '../src/ast_build';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';

const { describeNamed } = TestHelpers;

// describeNamed({ AstBuild }, () => {
//   const makeToken = Token.forTesting.makeFromStringOnly;
//   // TokenCollection.
//   describe('expressions and new lines', () => {
//     AstBuild.buildFor(TokenCollection.make([makeToken('\n')]));
//   });
// });
