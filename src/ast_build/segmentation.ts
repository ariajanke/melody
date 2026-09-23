/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { Helpers, raise, StandardErrorMessage } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export type SegmentType = 'functionDefinitionBody' | 'expression';

export interface Segmentation {
  segment(): Segment | undefined;
  error(): StandardErrorMessage;
};

export type SegmentationConstructor =
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number) => Segmentation;

export interface Segment {
  type    (): SegmentType;
  start   (): number;
  end     (): number;
  children(): Readonly<Segment[]>;
};

export interface SegmentClassInitialization {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
};

let sInitializable: SegmentClassInitialization | undefined = undefined;

export const Segment = freeze({
  hasValidIndices(segment: Segment): boolean {
    let cidx = 0;
    for (let idx = segment.start(); idx < segment.end(); ) {
      const child = segment.children()[cidx];
      if (idx === child?.start()) {
        if (!Segment.hasValidIndices(child) ||
            child.end() > segment.end())
          { return false; }

        idx = child.end();
        ++cidx;
      } else {
        ++idx;
      }
    }

    return cidx === segment.children().length;
  },
  initializeThisClass(i: SegmentClassInitialization): void {
    if (sInitializable)
      { raise('Segment already initialized'); }

    sInitializable = i;
  },
  isFringe(tok: Token | undefined): boolean {
    return tok === undefined ||
           tok.type() === Token.types.identifier ||
           Token.isLiteral(tok);
  },
  isClosing(tok: Token | undefined) {
    return tok === undefined || tok.type() === Token.types.grouping.closing;
  },
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined {
    return sInitializable!.groupingConstructorFor(token);
  }
});

export interface SegmentationClass {
  makeInitialSegmentation(mTokens: Readonly<Token[]>): Segmentation;
};

let sInitializableTn: SegmentationClass | undefined = undefined;

export const Segmentation = freeze({
  initializeThisClass(i: SegmentationClass) {
    if (sInitializableTn) {
      raise('Segmentation already initialized');
    }

    sInitializableTn = i;
  },
  makeInitialSegmentation(mTokens: Readonly<Token[]>) {
    return (sInitializableTn ?? raise('uninitialized class')).
      makeInitialSegmentation(mTokens);
  }
});
