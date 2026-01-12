import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  tickers: Array<{
    ticker: string;
    type: 'stock_br' | 'stock_us' | 'fixed_income' | 'reits' | 'crypto' | 'etf_br' | 'etf_us';
  }>;
}

interface QuoteResult {
  ticker: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  error?: string;
}

function formatTicker(ticker: string, type: string): string {
  // Brazilian assets need .SA suffix
  if (type === 'stock_br' || type === 'reits' || type === 'etf_br') {
    return ticker.includes('.SA') ? ticker : `${ticker}.SA`;
  }
  // Crypto uses specific suffixes
  if (type === 'crypto') {
    // Common crypto tickers
    const cryptoMap: Record<string, string> = {
      'BTC': 'BTC-USD',
      'ETH': 'ETH-USD',
      'SOL': 'SOL-USD',
      'XRP': 'XRP-USD',
      'ADA': 'ADA-USD',
      'DOT': 'DOT-USD',
      'DOGE': 'DOGE-USD',
      'AVAX': 'AVAX-USD',
      'MATIC': 'MATIC-USD',
      'LINK': 'LINK-USD',
    };
    return cryptoMap[ticker.toUpperCase()] || `${ticker}-USD`;
  }
  // US stocks and ETFs - use as-is
  return ticker;
}

async function fetchQuotes(tickers: Array<{ ticker: string; type: string }>): Promise<QuoteResult[]> {
  const results: QuoteResult[] = [];
  
  // Format tickers for Yahoo Finance
  const formattedTickers = tickers.map(t => ({
    original: t.ticker,
    formatted: formatTicker(t.ticker, t.type),
    type: t.type,
  }));

  const symbols = formattedTickers.map(t => t.formatted).join(',');
  
  try {
    console.log(`Fetching quotes for: ${symbols}`);
    
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const quotes = data.quoteResponse?.result || [];

    console.log(`Received ${quotes.length} quotes`);

    // Map results back to original tickers
    for (const tickerInfo of formattedTickers) {
      const quote = quotes.find((q: any) => 
        q.symbol?.toUpperCase() === tickerInfo.formatted.toUpperCase()
      );

      if (quote && quote.regularMarketPrice) {
        results.push({
          ticker: tickerInfo.original,
          price: quote.regularMarketPrice,
          currency: quote.currency || 'USD',
          change: quote.regularMarketChange || null,
          changePercent: quote.regularMarketChangePercent || null,
        });
        console.log(`${tickerInfo.original}: ${quote.regularMarketPrice} ${quote.currency}`);
      } else {
        results.push({
          ticker: tickerInfo.original,
          price: null,
          currency: tickerInfo.type.includes('br') || tickerInfo.type === 'reits' ? 'BRL' : 'USD',
          change: null,
          changePercent: null,
          error: 'Cotação não encontrada',
        });
        console.log(`${tickerInfo.original}: not found`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error fetching quotes:', errorMessage);
    // Return errors for all tickers
    for (const tickerInfo of formattedTickers) {
      results.push({
        ticker: tickerInfo.original,
        price: null,
        currency: tickerInfo.type.includes('br') || tickerInfo.type === 'reits' ? 'BRL' : 'USD',
        change: null,
        changePercent: null,
        error: `Erro ao buscar cotação: ${errorMessage}`,
      });
    }
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers } = await req.json() as QuoteRequest;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lista de tickers é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 50 tickers per request
    const limitedTickers = tickers.slice(0, 50);
    
    console.log(`Processing ${limitedTickers.length} tickers`);
    
    const quotes = await fetchQuotes(limitedTickers);

    return new Response(
      JSON.stringify({ quotes, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Error processing request:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});