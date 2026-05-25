import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória.' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null });
    }

    const html = await response.text();

    // Regex para encontrar og:image e twitter:image
    const ogImageRegex = /<meta\s+[^>]*property=["']og:image["']\s+[^>]*content=["']([^"']+)["']/i;
    const ogImageRegexAlt = /<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:image["']/i;
    
    let match = html.match(ogImageRegex) || html.match(ogImageRegexAlt);
    
    if (!match) {
      const twitterImageRegex = /<meta\s+[^>]*name=["']twitter:image["']\s+[^>]*content=["']([^"']+)["']/i;
      const twitterImageRegexAlt = /<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*name=["']twitter:image["']/i;
      match = html.match(twitterImageRegex) || html.match(twitterImageRegexAlt);
    }

    if (match && match[1]) {
      let imageUrl = match[1];
      imageUrl = imageUrl.replace(/&amp;/g, '&');
      
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(targetUrl);
        imageUrl = urlObj.origin + imageUrl;
      }
      return NextResponse.json({ imageUrl }, {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
      });
    }

    return NextResponse.json({ imageUrl: null }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar imagem de visualização do link:', error);
    return NextResponse.json({ imageUrl: null }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
}
