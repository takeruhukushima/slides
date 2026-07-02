import { createMiddleware } from 'hono/factory'
import { html, raw } from 'hono/html'
import slideStyle from '../slide.css?raw'
import slideScript from '../slide.js?raw'
import docStyle from '../doc.css?raw'

// Site origin used to turn relative paths into the absolute URLs OGP requires.
const SITE_URL = 'https://slides.yusu.ke'
// Fallback OGP image (lives in public/) used when a page sets no `image`.
const DEFAULT_OG_IMAGE = '/ogp.png'

const toAbsolute = (path?: string) => {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return SITE_URL + (path.startsWith('/') ? path : '/' + path)
}

export const rendererMiddleware = createMiddleware(async (c, next) => {
  c.setRenderer((content, { frontmatter }) => {
    const head = frontmatter ?? ({ title: '' } as typeof frontmatter)
    const isSlide = !!head.slide
    const theme = head.theme ?? 'dark'

    const ogImage = toAbsolute(head.image) ?? SITE_URL + DEFAULT_OG_IMAGE
    const ogUrl = toAbsolute(head.url) ?? SITE_URL + c.req.path

    const meta = (
      <>
        <meta charset='utf-8' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0'
        />
        <link rel='shortcut icon' href='/favicon.ico' />
        <link
          rel='stylesheet'
          href='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css'
        />
        <title>{head.title}</title>
        <meta property='og:title' content={head.title} />
        {head.description ? (
          <>
            <meta name='description' content={head.description} />
            <meta property='og:description' content={head.description} />
          </>
        ) : (
          <></>
        )}
        <meta property='og:type' content={isSlide ? 'article' : 'website'} />
        <meta property='og:url' content={ogUrl} />
        <meta property='og:image' content={ogImage} />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:creator' content='@yusukebe' />
        <meta name='twitter:image' content={ogImage} />
      </>
    )

    if (isSlide) {
      return c.html(
        <html>
          <head>
            {meta}
            {html`<style>${raw(slideStyle)}</style>`}
          </head>
          <body data-theme={theme}>
            <div id='deck'>
              <div id='slides'>{content}</div>
            </div>
            <div id='progress'></div>
            <div id='counter'></div>
            <div id='hint'>← → / space ・ f: fullscreen</div>
            <script src='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js'></script>
            <script>{raw(slideScript)}</script>
          </body>
        </html>
      )
    }

    return c.html(
      <html lang='ja'>
        <head>
          {meta}
          {html`<style>${raw(docStyle)}</style>`}
        </head>
        <body>
          <main>{content}</main>
        </body>
        <script src='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js'></script>
        <script>{raw('hljs.highlightAll()')}</script>
      </html>
    )
  })
  await next()
})

export default rendererMiddleware
