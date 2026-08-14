import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { AssignmentStripBuild } from './assignment_strip_build';
import { CallStripBuild } from './call_strip_build';
import { DotStripBuild } from './dot_strip_build';
import { LetMarkings } from './let_markings_stack';
import { StripBuild, StripBuildConstructor } from './strip_build';

function chooseSpecialization
  (callName: Token, markings: LetMarkings): StripBuildConstructor | undefined
{
  if (callName.content() === OperatorNamingSchema.kAssignment &&
      markings.isOutsideOfLetStatement())
  { return AssignmentStripBuild.make; }

  if (callName.content() === OperatorNamingSchema.kDot)
    { return DotStripBuild.make; }

  if (callName.content() === OperatorNamingSchema.kCall)
    { return CallStripBuild.make; }

  return undefined;
}

StripBuild.initializeThisClass({ chooseSpecialization });
