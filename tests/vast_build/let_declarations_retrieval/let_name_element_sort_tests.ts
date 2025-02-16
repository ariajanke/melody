import { TestHelpers } from '../../test_helpers';
import { LetNameElementSort } from '../../../src/vast_build/let_declarations_retrieval/let_name_element_sort';
import { AstLetDeclarationNode } from '../../../src/vast_build/ast_let_declaration_node';
import { AstStringLiteralNode } from '../../../src/vast_build/ast_string_literal_node';
import { LetNameElement } from '../../../src/vast_build/let_declarations_retrieval';

const { describeNamed } = TestHelpers;

describeNamed({ LetNameElementSort }, () => {
  function makeLetElementCommon() {
    return {
      operator: '=',
      declaringNode: AstLetDeclarationNode.make(AstStringLiteralNode.make('...')),
      valueNode: AstStringLiteralNode.make('...')
    };
  }
  const toName = (el: LetNameElement) => el.name;
  it('handles an element with one dependee', () => {
    // let a = 1
    // let b = a
    const s1: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'a',
      dependeeNames: []
    };
    const s2: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'b',
      dependeeNames: ['a']
    };
    const res = LetNameElementSort.sortedElementsFor([s1, s2]).map(toName);
    expect(res).toEqual(['a', 'b']);
  });

  it('handles an element with two dependees', () => {
    // let a = 1
    // let b = 1
    // let c = a + b
    const s1: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'a',
      dependeeNames: []
    };
    const s2: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'b',
      dependeeNames: []
    };
    const s3: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'c',
      dependeeNames: ['b', 'a']
    };
    const res = LetNameElementSort.sortedElementsFor([s2, s3, s1]).map(toName);
    expect(res).toEqual(['b', 'a', 'c']);
  });

  it('handles three levels of dependees/dependers', () => {
    // let a = 1
    // let b = 1 + a
    // let c = 1 + b
    const s1: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'a',
      dependeeNames: []
    };
    const s2: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'b',
      dependeeNames: ['a']
    };
    const s3: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'c',
      dependeeNames: ['b']
    };
    const res = LetNameElementSort.sortedElementsFor([s3, s1, s2]).map(toName);
    expect(res).toEqual(['a', 'b', 'c']);
  });

  it('can handle a complex mixed case', () => {
    // let a = 1
    // let b = 1 + a
    // let c = 1 + b
    // let d = c + b
    const s1: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'a',
      dependeeNames: []
    };
    const s2: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'b',
      dependeeNames: ['a']
    };
    const s3: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'c',
      dependeeNames: ['b']
    };
    const s4: LetNameElement = {
      ...makeLetElementCommon(),
      name: 'd',
      dependeeNames: ['c', 'b']
    };
    const res = LetNameElementSort.sortedElementsFor([s3, s4, s1, s2]).map(toName);
    expect(res).toEqual(['a', 'b', 'c', 'd']);
  });
});
