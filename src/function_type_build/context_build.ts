import * as cbs from './context_build/context_base_stage';
import * as cls from './context_build/context_link_stage';
import * as cdb from './context_build/context_declaration_build';
import * as rr from './context_build/receiver_resolution';

export type  ContextBaseStage = cbs.ContextBaseStage_;
export const ContextBaseStage = cbs.ContextBaseStage_;

export type  ContextLinkStage = cls.ContextLinkStage_;

export type ContextDeclarationBuild = cdb.ContextDeclarationBuild_;

export type ContextTypeProgression = cdb.ContextTypeProgression_;

export type ReceiverResolution = rr.ReceiverResolution_;
