import { ObjectLookUpTable } from '../../src/object_look_up_table';
import { ObjectType, WritableObjectType } from '../../src/object_type';
import { AstFunctionDefinitionNode } from '../../src/vast_build/ast_function_definition_node';
import { AstIntegerLiteralNode } from '../../src/vast_build/ast_integer_literal_node';
import { AstNode } from '../../src/vast_build/ast_node';
import { AstTupleNode } from '../../src/vast_build/ast_tuple_node';
import { LetNameElement } from '../../src/vast_build/let_names_collection';
import { VariableContextModifier } from '../../src/vast_build/variable_context_modifier';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ VariableContextModifier }, () => {
  function makeAElementWith(tupleElement: AstNode): LetNameElement {
    return {
      name: 'a',
      operator: ':=',
      dependeeNames: [],
      node: AstTupleNode.make(',', [ tupleElement ])
    };
  }
  function makeModifierFuncFor(tupleElement: AstNode, objLookUp: ObjectLookUpTable): VariableContextModifier {
    const el = makeAElementWith(tupleElement);
    const wobjType = WritableObjectType.make();
    return VariableContextModifier.make(el, wobjType, objLookUp);
  }
  function objTableWithBuiltIns() {
    return ObjectLookUpTable.make().addBuiltinTypes().addType(ObjectType.make('Context'));
  }
  describe('cannot find execution type of node', () => {
    function makeErrorfulModifier() {
      return makeModifierFuncFor(AstFunctionDefinitionNode.make([]),
                                 ObjectLookUpTable.make().addType(ObjectType.make('Context')));
    }

    it('reports not modifying context type', () => {
      const inst = makeErrorfulModifier();
      expect(inst.modifiedContextType()).not.toBeDefined();
    });

    it('contains a relevant error', () => {
      const inst = makeErrorfulModifier();
      inst.modifiedContextType();
      expect(inst.error().message).toEqual('Cannot find type by name "Function"');
    });
  });
  
  describe('for an (integer) variable declaration', () => {
    function makeModifierForInteger(wobjType = WritableObjectType.make()) {
      const el = makeAElementWith(AstIntegerLiteralNode.make('1'));
      const objTable = objTableWithBuiltIns();
      return VariableContextModifier.make(el, wobjType, objTable);
    }

    it('reports as having modified context type', () => {
      const inst = makeModifierForInteger();
      expect(inst.modifiedContextType()).toBeTruthy();
    });

    it('makes created variable accessible to the context type', () => {
      const wobjType = WritableObjectType.make();
      const inst = makeModifierForInteger(wobjType);
      inst.modifiedContextType();
      expect(wobjType.objectType().lookUp('.a')).toBeDefined();
    });
  });

  describe('for a (function definition) variable declaration', () => {
    function makeModifierForFunctionDef(wobjType = WritableObjectType.make()) {
      const el = makeAElementWith(AstFunctionDefinitionNode.make([]));
      return VariableContextModifier.
        make(el, wobjType, objTableWithBuiltIns().addType(wobjType.objectType()));
    }
    it('defines a method by that name', () => {
      const wobjType = WritableObjectType.make();
      const inst = makeModifierForFunctionDef(wobjType);
      inst.modifiedContextType();
      expect(wobjType.objectType().lookUp('a')).toBeDefined();
    });
  });
});
