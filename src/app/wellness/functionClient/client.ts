/**
 * The Function client: the only way the Wellness site reaches the edge function
 * (GLOSSARY.md). Screens call named domain actions. Only this module knows paths,
 * tokens and the Relay, and every action returns a Result instead of throwing.
 *
 * Add a domain by writing `<domain>.ts` on top of the core and listing it below.
 */
import { createCore, type GetToken } from './core'
import { createBestie } from './bestie'
import { createFreeDay, type FreeDayEnv } from './freeDay'
import { createMember } from './member'
import type { Transport } from './types'

export type FunctionClientEnv = FreeDayEnv

export interface FunctionClientOptions {
  transport: Transport
  /** The signed-in user's token, or the anon key. See token.ts. */
  getToken: GetToken
  env: FunctionClientEnv
}

export function createFunctionClient({ transport, getToken, env }: FunctionClientOptions) {
  const core = createCore(transport, getToken)
  return {
    freeDay: createFreeDay(core, env),
    member: createMember(core),
    bestie: createBestie(core),
  }
}

export type FunctionClient = ReturnType<typeof createFunctionClient>
