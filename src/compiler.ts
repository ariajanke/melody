import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { Helpers } from './helpers';
import { LetVisitor } from './interpreter';
import { LetNameElement } from './let_names_collection';
import { WasmCodeWriter } from './wasm_compilation';
// import { FunctionTypeRetrieval } from './function_type_retrieval';

const { freeze } = Helpers;

function construct(mCodeWriter = WasmCodeWriter.make()) {
  const mLetVisitor = LetVisitor.make();
  const inst = freeze({
    visitFringe(_0: AstNode) {
      // mCodeWriter.pushInteger()
    },
    visitLetDeclaration(_node: AstLetDeclarationNode, lhs: AstNode) {
      const collector = lhs.visit(mLetVisitor);
      const collection = collector.setType(context).finish();
      collection.elements()?.forEach((element: LetNameElement) => {
        context.declareVariable(element);
      });
      if (!collection.elements()) {
        throw new Error(collection.error().message);
      }
      
      lhs.visit(inst);
    }
  }) satisfies AstNodeVisitor;
}

const CompilationNodeVisitor = freeze({
  make: construct
});