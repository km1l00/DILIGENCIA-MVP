import { DEMO_HTML } from './content'

export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(DEMO_HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
