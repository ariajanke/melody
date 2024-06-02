import { AstFunctionCallNode } from './ast_function_call_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { AstFringeNode } from './ast_fringe_node';

const { freeze } = Helpers;

export interface TypeLookUpTable {
  lookUpIdentifierType: (identifierName: string) => ObjectType
}

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol,
  executionType: (types: TypeLookUpTable) => ObjectType
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  function makeUndefinedExecutionType(nodeTypeName: string):
    (_0: TypeLookUpTable) => ObjectType
  {
    return (_0: TypeLookUpTable): ObjectType => {
      throw Error(`${nodeTypeName} does not implement executionType`);
    };
  }

  return freeze({
    base: {
      makeUndefinedExecutionType
    },
    executionTypes,
    types:
      {
        functionCall: Symbol(),
        tuple: Symbol(),
        stringLiteral: Symbol(),
        identifier: Symbol(),
        letDeclaration: Symbol(),
        binaryOperator: Symbol(),
        integerLiteral: Symbol()
      }
    });
})();


export interface AstEvaluatableNode extends AstNode {
  evaluate: (getter: (name: string) => ContextVariable) => ContextVariable
}

export const AstEvaluatableNode = (() => {
  const { stringLiteral, identifier, integerLiteral } = AstNode.types;

  return freeze({
    tryDowncast: (node: AstNode): AstEvaluatableNode | undefined => {
      switch (node.type()) {
      case stringLiteral:
      case identifier:
      case integerLiteral:
        return node as AstEvaluatableNode;
      default: return undefined;
      }
    }
  });
})();

export interface AstNodeVisitor {
  visitFunctionCall: (node: AstFunctionCallNode) => void,
  visitBinaryOperation: (operation: string, lhs: AstNode, rhs: AstNode) => void,
  visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) => void,
  visitIdentifier: (node: AstFringeNode) => void
}

export const AstNodeVisitorBuilder = (() => {
  const class_ = freeze({
    make: () => {
      let mVisitBinaryOperation:
        AstNodeVisitor['visitBinaryOperation'] | undefined = undefined;
      let mVisitFunctionCall:
        AstNodeVisitor['visitFunctionCall'] | undefined = undefined;
      let mVisitLetDeclaration:
        AstNodeVisitor['visitLetDeclaration'] | undefined = undefined;
      let mVisitIdentifier:
        AstNodeVisitor['visitIdentifier'] | undefined = undefined;

      const inst = freeze({
        visitBinaryOperation: (fn: AstNodeVisitor['visitBinaryOperation']) => {
          mVisitBinaryOperation = fn;
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
        finish: (): AstNodeVisitor => {
          const impl = freeze({
            visitBinaryOperation: (op: string, lhs: AstNode, rhs: AstNode): void => {
              if (mVisitBinaryOperation) {
                return mVisitBinaryOperation(op, lhs, rhs);
              }
              lhs.visit(impl);
              rhs.visit(impl);
            },
            visitFunctionCall: (node: AstFunctionCallNode): void => {
              if (mVisitFunctionCall) {
                return mVisitFunctionCall(node);
              }
              node.arguments.forEach((node: AstNode) => node.visit(impl));
            },
            visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode): void => {
              if (mVisitLetDeclaration) {
                return mVisitLetDeclaration(node, rhs);
              }
              rhs.visit(impl);
            },
            visitIdentifier: (node: AstFringeNode) => {
              if (mVisitIdentifier) {
                return mVisitIdentifier(node);
              }
            }
          });
          return impl;
        }
      });

      return inst;
    }
  });

  return class_;
})();

// export const AstNodeVisitor = (() => {
//   const kDefaultImplementations = freeze({
//     visitBinaryOperation:
//       (_0: string, lhs: AstNode, rhs: AstNode): void =>
//     {
//       lhs.visit(kDefaultImplementations);
//       rhs.visit(kDefaultImplementations);
//     },
//     visitFunctionCall: (_0: AstFunctionCallNode): void => {},
//     visitLetDeclaration: (_0: AstLetDeclarationNode): void => {},
//     visitIdentifier: (_0: AstFringeNode): void => {}
//   });

//   // function makeFakeVisitor
//   //   ({
//   //     visitBinaryOperation,
//   //     visitFunctionCall,
//   //     visitLetDeclaration,
//   //     visitIdentifier
//   //   }: {
//   //     visitFunctionCall?: (node: AstFunctionCallNode) => void | undefined,
//   //     visitBinaryOperation?: (op: string, node: AstNode, rhs: AstNode) => void | undefined,
//   //     visitLetDeclaration?: (node: AstLetDeclarationNode) => void | undefined,
//   //     visitIdentifier?: typeof kDefaultImplementations.visitIdentifier
//   //   }): AstNodeVisitor
//   // {
//   //   const defaults = kDefaultImplementations;
//   //   return freeze({
//   //     visitBinaryOperation: visitBinaryOperation ?? defaults.visitBinaryOperation,
//   //     visitFunctionCall: visitFunctionCall ?? defaults.visitFunctionCall,
//   //     visitLetDeclaration: visitLetDeclaration ?? defaults.visitLetDeclaration,
//   //     visitIdentifier: visitIdentifier ?? defaults.visitIdentifier
//   //   });
//   // }

//   return freeze({ });
// })();

// export interface AstLetNode extends AstNode {
//   takenNames: () => string[],
//   primaryName: () => string
// };
