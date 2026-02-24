import { Helpers } from '../helpers';
import { IastNode, IastVisitor } from '../iast_node';
import { DastBuild } from '../dast_build';
import * as dldb from './let_declarations_retrieval/dast_let_declaration_build';
import * as LetNamesSplitter from './let_declarations_retrieval/let_names_splitter';

const { freeze } = Helpers;

export type LetNameElement = LetNamesSplitter.LetNameElement;

type DastLetDeclarationBuild = dldb.DastLetDeclarationBuild;
const DastLetDeclarationBuild = dldb.DastLetDeclarationBuild;

const CallLevelVisitor = (() => {
  const { makeError } = DastLetDeclarationBuild;
  const visitLet = (_0: IastNode): DastLetDeclarationBuild =>
    makeError('no nested let declarations allowed');

  const visitFringe = (_0: string): DastLetDeclarationBuild =>
    makeError('name needs a "= ..." following it');
    
  const visitString = (_0: string): DastLetDeclarationBuild =>
    makeError('string node cannot be a name in a let declaration');
  
  const visitInteger = (_0: string): DastLetDeclarationBuild =>
    makeError('integer node cannot be a name in a let declaration');
  
  const visitTuple = (_0: Readonly<IastNode[]>): DastLetDeclarationBuild =>
    makeError('tuple needs a "= ..." following it');
  
  const visitFunctionDefinition = (_0: Readonly<IastNode[]>): DastLetDeclarationBuild =>
    makeError('function definition cannot be a name in a let declaration');
    
  return freeze({
    make(
      mIntoDastBuild: (node: IastNode) => DastBuild
    ): IastVisitor<DastLetDeclarationBuild> {
      const visitCall =
        (callName: IastNode, receiver: IastNode, args: IastNode): DastLetDeclarationBuild =>
        DastLetDeclarationBuild.make(callName, receiver, args, mIntoDastBuild);
      return freeze({
        visitLet,
        visitFringe,
        visitString,
        visitInteger,
        visitTuple,
        visitFunctionDefinition,
        visitCall
       });
    }
  });
})();

export type NameExpressionValueMap = Readonly<{
  [name: string]: IastNode;
}>;

function make
  (mNode: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild)
  : DastLetDeclarationBuild
{
  return mNode.visit(CallLevelVisitor.make(mIntoDastBuild));
}

export const LetDeclarationsRetrieval = freeze({ make });

export type  LetDeclarationsRetrieval = ReturnType<typeof LetDeclarationsRetrieval.make>;
