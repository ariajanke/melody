import { AstFunctionCallNode } from './ast_function_call_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { AstFringeNode } from './ast_fringe_node';
import { type TypeResolution } from './type_resolution';

const { freeze } = Helpers;

export interface TypeLookUpTable {
  lookUpIdentifierType: (identifierName: string) => TypeResolution,
  lookUpStringLiteralType: () => TypeResolution,
  lookUpIntegerLiteralType: () => TypeResolution
}

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol,
  // I should first probably fix this...
  // this could fail, in which case you'd have Either an ObjectType or an Error
  executionType: (types: TypeLookUpTable) => TypeResolution
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  function makeUndefinedExecutionType(nodeTypeName: string):
    (_0: TypeLookUpTable) => TypeResolution
  {
    return (_0: TypeLookUpTable): TypeResolution => {
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
  function makeContinuingImplementations(): AstNodeVisitor {
    const inst = freeze({
      visitBinaryOperation: (_0: string, lhs: AstNode, rhs: AstNode): void => {
        lhs.visit(inst);
        rhs.visit(inst);
      },
      visitFunctionCall: (node: AstFunctionCallNode): void => {
        node.arguments.forEach((node: AstNode) => node.visit(inst));
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, rhs: AstNode): void => {
        rhs.visit(inst);
      },
      visitIdentifier: (_0: AstFringeNode) => {}
    });
    return inst;
  }
  function makeStoppingImplementations(): AstNodeVisitor {
    const inst = freeze({
      visitBinaryOperation: (_0: string, _1: AstNode, _2: AstNode): void => {},
      visitFunctionCall: (_0: AstFunctionCallNode): void => {},
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode): void => {},
      visitIdentifier: (_0: AstFringeNode) => {}
    });
    return inst;
  }

  const kContinuingImplementations = makeContinuingImplementations();
  const kStoppingImplementations = makeStoppingImplementations();

  const class_ = freeze({
    makeDefaultingToStop: () =>
      class_.make(kStoppingImplementations),
    makeDefaultingToContinue: () =>
      class_.make(kContinuingImplementations),
    make: (kDefaultImplementations: AstNodeVisitor) => {
      let mVisitBinaryOperation = kDefaultImplementations.visitBinaryOperation;
      let mVisitFunctionCall = kDefaultImplementations.visitFunctionCall;
      let mVisitLetDeclaration = kDefaultImplementations.visitLetDeclaration;
      let mVisitIdentifier = kDefaultImplementations.visitIdentifier;
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
        finish: (): AstNodeVisitor => freeze({
          visitBinaryOperation: mVisitBinaryOperation,
          visitFunctionCall: mVisitFunctionCall,
          visitLetDeclaration: mVisitLetDeclaration,
          visitIdentifier: mVisitIdentifier
        })
      });

      return inst;
    }
  });

  return class_;
})();

// export const AstNodeVisitorBuilder = (() => {
//   const class_ = freeze({
//     make: () => {
//       let mVisitBinaryOperation:
//         AstNodeVisitor['visitBinaryOperation'] | undefined = undefined;
//       let mVisitFunctionCall:
//         AstNodeVisitor['visitFunctionCall'] | undefined = undefined;
//       let mVisitLetDeclaration:
//         AstNodeVisitor['visitLetDeclaration'] | undefined = undefined;
//       let mVisitIdentifier:
//         AstNodeVisitor['visitIdentifier'] | undefined = undefined;

//       const inst = freeze({
//         visitBinaryOperation: (fn: AstNodeVisitor['visitBinaryOperation']) => {
//           mVisitBinaryOperation = fn;
//           return inst;
//         },
//         visitFunctionCall: (fn: AstNodeVisitor['visitFunctionCall']) => {
//           mVisitFunctionCall = fn;
//           return inst;
//         },
//         visitLetDeclaration: (fn: AstNodeVisitor['visitLetDeclaration']) => {
//           mVisitLetDeclaration = fn;
//           return inst;
//         },
//         visitIdentifier: (fn: AstNodeVisitor['visitIdentifier']) => {
//           mVisitIdentifier = fn;
//           return inst;
//         },
//         finish: (): AstNodeVisitor => {
//           const impl = freeze({
//             visitBinaryOperation: (op: string, lhs: AstNode, rhs: AstNode): void => {
//               if (mVisitBinaryOperation) {
//                 return mVisitBinaryOperation(op, lhs, rhs);
//               }
//               lhs.visit(impl);
//               rhs.visit(impl);
//             },
//             visitFunctionCall: (node: AstFunctionCallNode): void => {
//               if (mVisitFunctionCall) {
//                 return mVisitFunctionCall(node);
//               }
//               node.arguments.forEach((node: AstNode) => node.visit(impl));
//             },
//             visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode): void => {
//               if (mVisitLetDeclaration) {
//                 return mVisitLetDeclaration(node, rhs);
//               }
//               rhs.visit(impl);
//             },
//             visitIdentifier: (node: AstFringeNode) => {
//               if (mVisitIdentifier) {
//                 return mVisitIdentifier(node);
//               }
//             }
//           });
//           return impl;
//         }
//       });

//       return inst;
//     }
//   });

//   return class_;
// })();
