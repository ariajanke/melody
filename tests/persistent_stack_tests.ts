import { PersistentStack } from '../src/persistent_stack';
import { TestHelpers } from './test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ PersistentStack }, () => {
  it('pushes a new element and reports as not empty', () => {
    const s = PersistentStack.make(() => 'a');
    s.push();
    expect(s.isEmpty()).not.toBeTruthy();
  });

  it('pushes a new element and returns that new element', () => {
    const s = PersistentStack.make(() => 'a');
    expect(s.push()).toEqual('a');
  });

  it('popping an element on a one sized stack, produces an empty stack', () => {
    const s = PersistentStack.make(() => 'a');
    s.push();
    s.pop();
    expect(s.isEmpty()).toBeTruthy();
  });

  it('persists old values of a stack even after being popped', () => {
    const s = PersistentStack.make(() => ({ e: 1 }));
    s.push().e = 10;
    s.pop();
    expect(s.push()?.e).toEqual(10);
  });
});
