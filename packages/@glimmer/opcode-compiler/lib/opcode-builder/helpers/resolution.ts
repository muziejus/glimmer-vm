import { DEBUG } from '@glimmer/env';
import {
  CompileTimeConstants,
  CompileTimeResolver,
  ContainingMetadata,
  Expressions,
  Owner,
  ResolveComponentOp,
  ResolveComponentOrHelperOp,
  ResolveHelperOp,
  ResolveModifierOp,
  ResolveOptionalComponentOrHelperOp,
  ResolveOptionalHelperOp,
  SexpOpcodes,
  ResolutionTimeConstants,
} from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

function isGetLikeTuple(opcode: Expressions.Expression): opcode is Expressions.TupleExpression {
  return Array.isArray(opcode) && opcode.length === 2;
}

function makeResolutionTypeVerifier(typeToVerify: SexpOpcodes) {
  return (opcode: Expressions.Expression): opcode is Expressions.GetFree => {
    if (!isGetLikeTuple(opcode)) return false;

    let type = opcode[0];

    if (DEBUG && type === SexpOpcodes.GetStrictFree) {
      throw new Error(
        'Strict Mode: Attempted to resolve strict free, but this has not been implemented yet'
      );
    }

    return type === SexpOpcodes.GetStrictFree || type === typeToVerify;
  };
}

export const isGetFreeComponent = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsComponentHead);

export const isGetFreeModifier = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsModifierHead);

export const isGetFreeHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsHelperHead);

export const isGetFreeComponentOrHelper = makeResolutionTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHead
);

export const isGetFreeOptionalHelper = makeResolutionTypeVerifier(
  SexpOpcodes.GetFreeAsHelperHeadOrThisFallback
);

export const isGetFreeOptionalComponentOrHelper = makeResolutionTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback
);

interface RequiredContainingMetadata extends ContainingMetadata {
  owner: Owner;
  upvars: string[];
}

function assertResolverInvariants(meta: ContainingMetadata): RequiredContainingMetadata {
  if (DEBUG) {
    if (!meta.upvars) {
      throw new Error('Attempted to resolve a component, but no free vars were found');
    }

    if (!meta.owner) {
      throw new Error(
        'Attempted to resolve a component, but no owner was associated with the template it was being resolved from'
      );
    }
  }

  return (meta as unknown) as RequiredContainingMetadata;
}

/**
 * <Foo/>
 * <Foo></Foo>
 * <Foo @arg={{true}} />
 */
export function resolveComponent(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveComponentOp
): void {
  assert(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let definition = resolver.lookupComponent(name, owner)!;

  if (DEBUG && definition === null) {
    throw new Error(
      `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
    );
  }

  then(constants.resolvedComponent(definition, name));
}

/**
 * (helper)
 * (helper arg)
 */
export function resolveHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveHelperOp
): void {
  assert(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let helper = resolver.lookupHelper(name, owner)!;

  if (DEBUG && helper === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  then(constants.helper(owner, helper, name));
}

/**
 * <div {{modifier}}/>
 * <div {{modifier arg}}/>
 * <Foo {{modifier}}/>
 */
export function resolveModifier(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveModifierOp
): void {
  assert(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let modifier = resolver.lookupModifier(name, owner)!;

  if (DEBUG && modifier === null) {
    throw new Error(
      `Attempted to resolve \`${name}\`, which was expected to be a modifier, but nothing was found.`
    );
  }

  then(constants.modifier(owner, modifier, name));
}

/**
 * {{component-or-helper arg}}
 */
export function resolveComponentOrHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve a component or helper with incorrect opcode'
  );
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let definition = resolver.lookupComponent(name, owner);

  if (definition !== null) {
    then(constants.resolvedComponent(definition, name));
  } else {
    let helper = resolver.lookupHelper(name, owner);

    if (DEBUG && helper === null) {
      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a component or helper, but nothing was found.`
      );
    }

    then(constants.helper(owner, helper!, name));
  }
}

/**
 * <Foo @arg={{helper}}>
 */
export function resolveOptionalHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveOptionalHelperOp
): void {
  assert(isGetFreeOptionalHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let helper = resolver.lookupHelper(name, owner);

  then(helper !== null ? constants.helper(owner, helper, name) : name);
}

/**
 * {{maybeHelperOrComponent}}
 */
export function resolveOptionalComponentOrHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveOptionalComponentOrHelperOp
): void {
  assert(
    isGetFreeOptionalComponentOrHelper(expr),
    'Attempted to resolve an optional component or helper with incorrect opcode'
  );
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let definition = resolver.lookupComponent(name, owner);

  if (definition !== null) {
    then(constants.resolvedComponent(definition, name));
  } else {
    let helper = resolver.lookupHelper(name, owner);

    then(helper !== null ? constants.helper(owner, helper, name) : name);
  }
}
