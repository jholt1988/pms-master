/**
 * @propertyos/api-contracts — the single source of truth for PropertyOS API types.
 *
 * The barrel exports the hand-authored layer: the response envelope, the
 * cross-cutting event/decision contracts, and shared domain types. The
 * OpenAPI-generated seam lives at the `/schemas` subpath
 * (`@propertyos/api-contracts/schemas`) so consumers that only need
 * envelope/domain types don't compile the large generated file.
 */
export * from './envelope';
export * from './contracts';
export * from './domains/lease';
