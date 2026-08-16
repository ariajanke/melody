import { Helpers, InternalNaming } from './helpers';

const { freeze, makeIsStringInLookUpTable } = Helpers;

const kAnd = 'and';
const kOr = 'or';
const kNot = 'not';
const kIs = 'is';
const kLet = 'let';

const kEquality = '=';
const kMultiply = '*';
const kComma = ',';
const kPlus = '+';
const kMinus = '-';
const kDivide = '/';
const kDot = '.';
const kAssignment = ':=';
const kCall = InternalNaming.mapToInternalName('call');

const kAlphabeticOperators = [
  kLet,
  kAnd,
  kOr,
  kNot,
  kIs
] as const;
const kOperators = [
  ...kAlphabeticOperators,
  kComma,
  kPlus,
  kMinus,
  kDivide,
  kDot,
  kEquality,
  kAssignment,
  kMultiply
] as const;
const kOperatorCharacters = [
  kEquality,
  kMultiply,
  kMinus,
  kComma,
  kPlus,
  kDivide,
  kDot
] as const;

export const OperatorNamingSchema = freeze({
  isAlphabeticOperator: makeIsStringInLookUpTable(kAlphabeticOperators),
  isOperator: makeIsStringInLookUpTable(kOperators),
  kOperatorCharacters,

  kLet,
  kAnd,
  kOr,
  kNot,
  kIs,

  kComma,
  kPlus,
  kMinus,
  kDivide,
  kDot,
  kEquality,
  kAssignment,
  kMultiply,

  kCall,
});
