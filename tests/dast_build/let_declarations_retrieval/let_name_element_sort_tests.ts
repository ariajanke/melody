import { TestHelpers } from '../../test_helpers';
import {
  LetNameElementSort
} from '../../../src/dast_build/let_declarations_retrieval/let_name_element_sort';
import { LetNameElement }
  from '../../../src/dast_build/let_declarations_retrieval';
import { IastNode } from '../../../src/iast_node';
import { Token } from '../../../src/token';

const { describeNamed } = TestHelpers;

describeNamed({ LetNameElementSort }, () => {
  const makeFringe = (v: string) =>
    IastNode.makeFringe(Token.forTesting.makeFromStringOnly(v));
  function makeLetElementCommon() {
    return {
      operator: '=',
      value: makeFringe('...')
    };
  }
  const toName = (el: LetNameElement) => {
    if ('name' in el)
      { return el.name; }
    throw new Error(`is a many names element (${el.names.join(',')})`);
  };
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
