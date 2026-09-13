import { Helpers } from '../helpers';
import { IastLiteralType, IastNode, IastVisitor } from '../iast_node';
import { DastBuild } from '../dast_build';
import * as dldb from './let_declarations_retrieval/dast_let_declaration_build';
import * as LetNamesSplitter from './let_declarations_retrieval/let_names_splitter';
import { Token } from '../token';

const { freeze } = Helpers;

export type LetNameElement = LetNamesSplitter.LetNameElement;

type DastLetDeclarationBuild = dldb.DastLetDeclarationBuild;
const DastLetDeclarationBuild = dldb.DastLetDeclarationBuild;

type CallLevelVisitorConstructor =
  (mIntoDastBuild: (node: IastNode) => DastBuild) =>
  IastVisitor<DastLetDeclarationBuild>;

const CallLevelVisitor = ((): { make: CallLevelVisitorConstructor } => {
  const { makeError } = DastLetDeclarationBuild;
  const visitLet = (_0: IastNode): DastLetDeclarationBuild =>
    makeError('no nested let declarations allowed');

  const visitFringe = (_0: Token): DastLetDeclarationBuild =>
    makeError('name needs a "= ..." following it');

  const visitLiteral = (_0: Token, _1: IastLiteralType) =>
    makeError('literal node cannot be a name in a let declaration');

  const visitTuple = (_0: Readonly<IastNode[]>): DastLetDeclarationBuild =>
    makeError('tuple needs a "= ..." following it');
  
  const visitFunctionDefinition = (_0: Readonly<IastNode[]>): DastLetDeclarationBuild =>
    makeError('function definition cannot be a name in a let declaration');
    
  return freeze({
    make(
      mIntoDastBuild: (node: IastNode) => DastBuild
    ): IastVisitor<DastLetDeclarationBuild> {
      const visitCall =
        (callName: Token, receiver: IastNode, args: IastNode): DastLetDeclarationBuild =>
        DastLetDeclarationBuild.make(callName.content(), receiver, args, mIntoDastBuild);
      return freeze({
        visitLet,
        visitFringe,
        visitLiteral,
        visitTuple,
        visitFunctionDefinition,
        visitCall
       });
    }
  });
})();

function make
  (mNode: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild)
  : DastLetDeclarationBuild
{
  return mNode.visit(CallLevelVisitor.make(mIntoDastBuild));
}

export const LetDeclarationsRetrieval = freeze({ make });

export type  LetDeclarationsRetrieval = ReturnType<typeof LetDeclarationsRetrieval.make>;
