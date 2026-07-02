/// <reference types="vite/client" />
import {} from 'hono'

type Meta = {
  title: string
  description?: string
  url?: string
  /** OGP image. Absolute URL or a path under public/ (e.g. /ogp/hello.png). */
  image?: string
  date?: string
  slide?: boolean
  theme?: 'dark' | 'light'
}

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string,
      props: { frontmatter: Meta }
    ): Response | Promise<Response>
  }
}

declare module '*.mdx' {
  const Component: (props: Record<string, unknown>) => unknown
  export default Component
  export const frontmatter: Meta
}
