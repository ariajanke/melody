import { Helpers } from '../helpers';
import { type AstFunctionCallNode } from './ast_function_call_node';
import { type AstLetDeclarationNode } from './ast_let_declaration_node';
import { type AstNode } from './ast_node';
import { type AstTupleNode } from './ast_tuple_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstLiteralNode } from './ast_fringe_node';

const { freeze } = Helpers;

export interface AstNodeVisitor<AccumulationType = void> {
  visitFunctionCall:
    (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) =>
    AccumulationType,
  visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) =>
    AccumulationType,
  visitIdentifier: (node: AstIdentifierNode) => AccumulationType,
  visitTuple: (node: AstTupleNode) => AccumulationType,
  visitFunctionDefinition: (node: AstFunctionDefinitionNode, lineNodes: AstNode[]) =>
    AccumulationType,
  visitLiteral: (node: AstLiteralNode) => AccumulationType
}

interface ReseatableAstNodeVisitor extends AstNodeVisitor {
  setInstanceReference: (inst: AstNodeVisitor) => AstNodeVisitor
}

export const AstNodeVisitorBuilder = (() => {
  function makeContinuingImplementations(): ReseatableAstNodeVisitor {
    let mCurrentInst: AstNodeVisitor | ReseatableAstNodeVisitor = freeze({
      visitLiteral: (_0: AstLiteralNode): void => {},
      visitFunctionCall: (_0: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): void => {
        receiver.visit(mCurrentInst);
        fArgs.forEach((node: AstNode) => node.visit(mCurrentInst));
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, rhs: AstNode): void => {
        rhs.visit(mCurrentInst);
      },
      visitIdentifier: (_0: AstIdentifierNode) => {},
      visitTuple: (tuple: AstTupleNode) => {
        tuple.forEach((node: AstNode) => node.visit(mCurrentInst));
      },
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, nodes: AstNode[]) => {
        nodes.forEach((node: AstNode) => node.visit(mCurrentInst));
      },
      setInstanceReference: (inst: AstNodeVisitor) => {
        mCurrentInst = inst;
        return inst;
      }
    });
    return mCurrentInst as ReseatableAstNodeVisitor;
  }

  const kStoppingImplementations = ((): ReseatableAstNodeVisitor => {
    const inst = freeze({
      visitLiteral: (_0: AstLiteralNode): void => {},
      visitFunctionCall: (_0: AstFunctionCallNode, _1: AstNode, _2: AstTupleNode): void =>
        {},
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode): void => {},
      visitIdentifier: (_0: AstIdentifierNode) => {},
      visitTuple: (_0: AstTupleNode) => {},
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) => {},
      setInstanceReference: (passedInst: AstNodeVisitor) =>
        passedInst
    });
    return inst;
  })();

  const class_ = freeze({
    makeDefaultingToStop: () =>
      class_.make(kStoppingImplementations),
    makeDefaultingToContinue: () =>
      class_.make(makeContinuingImplementations()),
    make: (mImplementations: ReseatableAstNodeVisitor) => {
      let mVisitFunctionCall = mImplementations.visitFunctionCall;
      let mVisitLetDeclaration = mImplementations.visitLetDeclaration;
      let mVisitIdentifier = mImplementations.visitIdentifier;
      let mVisitTuple = mImplementations.visitTuple;
      let mVisitFunctionDefinition = mImplementations.visitFunctionDefinition;
      let mVisitLiteral = mImplementations.visitLiteral;
      const inst = freeze({
        visitFringe: (fn: AstNodeVisitor['visitLiteral']) => {
          mVisitLiteral = fn;
          return inst;
        },
        visitFunctionCall: (fn: AstNodeVisitor['visitFunctionCall']) => {
          mVisitFunctionCall = fn;
          return inst;
        },
        visitLetDeclaration: (fn: AstNodeVisitor['visitLetDeclaration']) => {
          mVisitLetDeclaration = fn;
          return inst;
        },
        visitIdentifier: (fn: AstNodeVisitor['visitIdentifier']) => {
          mVisitIdentifier = fn;
          return inst;
        },
        visitTuple: (fn: AstNodeVisitor['visitTuple']) => {
          mVisitTuple = fn;
          return inst;
        },
        visitFunctionDefinition: (fn: AstNodeVisitor['visitFunctionDefinition']) => {
          mVisitFunctionDefinition = fn;
          return inst;
        },
        finish: (): AstNodeVisitor => {
          const inst = freeze({
            visitFunctionCall: mVisitFunctionCall,
            visitLetDeclaration: mVisitLetDeclaration,
            visitIdentifier: mVisitIdentifier,
            visitTuple: mVisitTuple,
            visitFunctionDefinition: mVisitFunctionDefinition,
            visitLiteral: mVisitLiteral
          });
          return mImplementations.setInstanceReference(inst);
        }
      });

      return inst;
    }
  });

  return class_;
})();
