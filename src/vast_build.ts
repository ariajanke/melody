import { AstLiteralNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { FunctionLookUpTable } from './function_look_up_table';
import { FunctionType } from './function_type';
import { Helpers, StandardErrorMessage } from './helpers';
import { MemoryArray } from './memory_array';
import { ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';

const { freeze, memoize } = Helpers;

// Validated Abstract Syntax Tree Node, just doesn't quite roll off the tongue

interface VastNode {
  // valueType
  objectType(): ObjectType,
  functionType(): FunctionType,
  // abilityStatus(): symbol
  itCanBe(ability: (() => symbol)): boolean,

  // a uid for compilers/interpreters to remember stuff by
  uid(): symbol
}

interface VastFunctionCallNode extends VastNode {
  // on construction
  // - verify (continue or raise) validity
  // - force as much validity by argument types as possible
  // allow receivers:
  // literals may receive:
  //   any defined: ".",
  
}

interface VastFunctionDefinitionNode extends VastNode {

}



// each will have:
// - a context
const VastNode = freeze({
  ableToBe: {
    evaluated: memoize(Symbol)
    // KEEP: reserved for resolved
    // KEEP: reserved for discovered
  },
  itCanBe(...abilities: (() => symbol)[]): (fn: () => symbol) => boolean {
    return (fn: () => symbol) =>
      abilities.findIndex((can: () => symbol) => can() === fn()) > -1;
  }
  // {
  //   evaluated: memoize(Symbol),
  //   resolved: memoize(Symbol)
  // },
  // // value knowable before run time
  // isEvaluatable(node: VastNode)
  //   { return node.abilityStatus() === VastNode.itCanBe.evaluated(); },
  // isResolvable(node: VastNode)
  //   { return node.abilityStatus() === VastNode.itCanBe.resolved(); }
});

const VastStringLiteralNode = freeze({
  make(mStringType: ObjectType, mValue: string): VastNode {
    const { itCanBe, ableToBe } = VastNode;
    ;
    return freeze({
      objectType: () => mStringType,
      itCanBe: itCanBe(ableToBe.evaluated),
      uid: memoize(Symbol)
    });
  }
});

const VastIntegerLiteralNode = freeze({
  make(mIntegerType: ObjectType, mValue: number): VastNode {
    const { itCanBe, ableToBe } = VastNode;
    return freeze({
      objectType: () => mIntegerType,
      itCanBe: itCanBe(ableToBe.evaluated),
      uid: memoize(Symbol)
    });
  }
});

const VastIdentifierNode = freeze({
  make(mDefinedBy: FunctionType) {
    const { itCanBe } = VastNode;
    return freeze({
      objectType: () => ObjectType.makeForTuple(mDefinedBy.returns()),
      functionType: () => mDefinedBy,
      itCanBe: itCanBe(),
      uid: memoize(Symbol)
    });
  }
});

const VastFunctionDefinitionNode = (() => {
  const counter = (() => {
    let i = 0;
    return () => i++;
  })();

  return freeze({
    make(lineNodes: Readonly<VastNode[]>, name?: string) {
      const mFunctionNumber = counter();
      return freeze({
        objectType: memoize(() =>
          ObjectType.make(name ?? `<fn def (uid: ${mFunctionNumber})>`))
      });
    }
  });
})();

const VastFunctionCallNode = freeze({
  // we try and keep validating class methods that can work with both
  // VAST as well as AST nodes
  validateFunctionParameters:
    (functionType: FunctionType,
     parameterType: ObjectType,
     onError: (msg: string) => void): void =>
  {
    let msg: string | undefined = undefined;
    const givenParams = parameterType.decomposeAsParameters();
    const expectedParams = functionType.parameters();
    if (givenParams.length !== expectedParams.length) {
      msg = `function type expected ${expectedParams.length} parameters`; 
    }
    msg || givenParams.forEach((givenParam: ObjectType, idx: number) => {
      const expectedParam = expectedParams[idx];
      if (msg || givenParam.uid() === expectedParam.uid())
        { return; }
      msg = `Parameter (${idx}) expected to be a "${expectedParam.name()}", got a "${givenParam.name()}" instead`;
    });
    msg && onError( msg );
    return undefined;
  },
  make(mFunctionType: FunctionType, mParameters: VastNode) {
    VastFunctionCallNode.
      validateFunctionParameters(mFunctionType, mParameters.objectType(), (msg: string) =>
        { throw new Error(msg); });
  }
});

interface VastBuildResult {
  root(): VastNode,
  errors(): Readonly<StandardErrorMessage[]>
}

const VastBuild = freeze({
  make(): AstNodeVisitor {
    return freeze({
      visitFunctionCall:
        (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) =>
        {},
      visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) =>
        {},
      visitIdentifier: (node: AstIdentifierNode) => {},
      visitTuple: (node: AstTupleNode) => {},
      visitFunctionDefinition: (node: AstFunctionDefinitionNode, lineNodes: AstNode[]) =>
        {},
      visitLiteral: (node: AstLiteralNode) => {}
    })
  }
});

// interface VastNodeVisitor<AccumulationType = void> {
//   // which includes fringe nodes, they're just function calls!
//   onCall:
//     () =>
//     AccumulationType,
//   onDefinition: (node: AstTupleNode) => AccumulationType,
//   visitFunctionDefinition: (node: AstFunctionDefinitionNode, lineNodes: AstNode[]) =>
//     AccumulationType,
//   visitLiteral: (node: AstLiteralNode) => AccumulationType
// }

function interpret(node: VastNode) {
  node.functionType().
    onBuiltIn((fn: (stack: PersistentStack<number>, memory: MemoryArray) => void) => {

    })
}