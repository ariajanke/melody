import { Helpers } from '../helpers';
import { IastNode, IastVisitor } from '../iast_node';
import { DastBuild } from '../dast_build';
import { DastLetDeclaration_ } from './let_declarations_retrieval/dast_let_declaration_';
import * as LetNamesSplitter from './let_declarations_retrieval/let_names_splitter';

const { freeze } = Helpers;

export type LetNameElement = LetNamesSplitter.LetNameElement;
export type DastLetDeclaration = DastLetDeclaration_;

const CallLevelVisitor = (() => {
  const visitLet = (_0: IastNode): DastLetDeclaration =>
    DastLetDeclaration_.makeError('no nested let declarations allowed');

  const visitFringe = (_0: string): DastLetDeclaration =>
    DastLetDeclaration_.makeError('name needs a "= ..." following it');
    
  const visitString = (_0: string): DastLetDeclaration =>
    DastLetDeclaration_.makeError('string node cannot be a name in a let declaration');
  
  const visitInteger = (_0: string): DastLetDeclaration =>
    DastLetDeclaration_.makeError('integer node cannot be a name in a let declaration');
  
  const visitTuple = (_0: Readonly<IastNode[]>): DastLetDeclaration =>
    DastLetDeclaration_.makeError('tuple needs a "= ..." following it');
  
  const visitFunctionDefinition = (_0: Readonly<IastNode[]>): DastLetDeclaration =>
    DastLetDeclaration_.makeError('function definition cannot be a name in a let declaration');
    
  return freeze({
    make(mIntoDastBuild: (node: IastNode) => DastBuild): IastVisitor<DastLetDeclaration> {
      const visitCall =
        (callName: IastNode, receiver: IastNode, args: IastNode): DastLetDeclaration =>
        DastLetDeclaration_.make(callName, receiver, args, mIntoDastBuild);
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
  : DastLetDeclaration
{
  return mNode.visit(CallLevelVisitor.make(mIntoDastBuild));
}

export const LetDeclarationsRetrieval = freeze({ make });

export type  LetDeclarationsRetrieval = ReturnType<typeof LetDeclarationsRetrieval.make>;
