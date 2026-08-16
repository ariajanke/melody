import { Helpers } from './helpers';

const { freeze, makeIsStringInLookUpTable } = Helpers;

const kFunctionDefinition = 'fn';
const kTableDefinition = 'tbl';
const kTupleOpen = '(';
const kTupleClose = ')';
const kBodyClose = '~';
const kGroupingCharacters = [kTupleOpen, kTupleClose, kBodyClose] as const;
const kAllGroupings = [...kGroupingCharacters, kFunctionDefinition, kTableDefinition] as const;

export const GroupingNamingSchema = freeze({
  isGrouping: makeIsStringInLookUpTable(kAllGroupings),
  kGroupingCharacters,
  kAllGroupings,
  kFunctionDefinition,
  kTableDefinition,
  kBodyClose
});
