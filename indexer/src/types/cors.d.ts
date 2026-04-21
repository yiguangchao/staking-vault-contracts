declare module 'cors' {
  import type { RequestHandler } from 'express'

  type CorsDelegate<T = unknown> = (
    req: T,
    callback: (err: Error | null, options?: CorsOptions) => void
  ) => void

  interface CorsOptions {
    origin?: boolean | string | RegExp | Array<boolean | string | RegExp> | CorsDelegate
    methods?: string | string[]
    allowedHeaders?: string | string[]
    exposedHeaders?: string | string[]
    credentials?: boolean
    maxAge?: number
    preflightContinue?: boolean
    optionsSuccessStatus?: number
  }

  function cors(options?: CorsOptions): RequestHandler

  export = cors
}
