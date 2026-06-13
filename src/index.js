import * as OpenCC from 'opencc-js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 拦截对 /api/poem 的请求
    if (url.pathname === "/api/poem") {
      return handleApiRequest(url, env);
    }

    // 其他请求直接返回静态资源
    return env.ASSETS.fetch(request);
  },
};

const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
const t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });

async function handleApiRequest(url, env) {
  const action = url.searchParams.get("action");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const tursoUrl = env.TURSO_DATABASE_URL;
  const tursoToken = env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    return new Response(
      JSON.stringify({ error: "Missing Turso credentials in environment" }),
      { status: 500, headers }
    );
  }

  async function queryTurso(sql, args = []) {
    // Convert args to Turso HTTP API format
    const formattedArgs = args.map(arg => {
        if (typeof arg === 'string') return { type: "text", value: arg };
        if (typeof arg === 'number') {
            return Number.isInteger(arg) ? { type: "integer", value: arg.toString() } : { type: "float", value: arg };
        }
        if (typeof arg === 'boolean') return { type: "integer", value: arg ? "1" : "0" };
        if (arg === null) return { type: "null" };
        return { type: "text", value: String(arg) };
    });

    const body = {
      requests: [{ type: "execute", stmt: { sql, args: formattedArgs } }, { type: "close" }],
    };

    let baseUrl = tursoUrl.endsWith("/") ? tursoUrl.slice(0, -1) : tursoUrl;
    baseUrl = baseUrl.replace(/^libsql:\/\//, "https://").replace(/^wss:\/\//, "https://");

    const res = await fetch(`${baseUrl}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tursoToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Turso API Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const executeResult = data.results[0];

    if (executeResult.type === "error") {
      throw new Error(executeResult.error.message);
    }

    return executeResult.response.result.rows;
  }

  try {
    if (action === "check") {
      const sentence = url.searchParams.get("sentence");
      if (!sentence)
        return new Response(JSON.stringify({ error: "Missing sentence" }), {
          status: 400,
          headers,
        });

      // User might enter simplified, convert to traditional for DB search
      const traditionalSentence = s2tConverter(sentence);
      const cleanSentence = traditionalSentence.replace(/[，。？！、\s]/g, "");
      const prefix = cleanSentence.substring(0, 4);

      // Fetch more rows to avoid limit clipping issues
      const rows = await queryTurso(
        "SELECT dynasty, author, title, paragraphs FROM poems WHERE paragraphs LIKE '%' || ? || '%' LIMIT 100",
        [prefix]
      );

      let exists = false;
      let source = "";
      for (let row of rows) {
        if (!row[3] || !row[3].value) continue;
        const text = row[3].value.replace(/[，。？！、\s]/g, "");
        if (text.includes(cleanSentence)) {
          exists = true;
          const dynasty = t2sConverter(row[0]?.value || "");
          const author = t2sConverter(row[1]?.value || "");
          const title = t2sConverter(row[2]?.value || "");
          source = `[${dynasty}] ${author}《${title}》`;
          break;
        }
      }
      return new Response(JSON.stringify({ exists, source }), { headers });
    } else if (action === "computer") {
      const keywordRaw = url.searchParams.get("keyword");
      const usedStr = url.searchParams.get("used") || "";
      const used = usedStr ? usedStr.split(",") : [];

      if (!keywordRaw)
        return new Response(JSON.stringify({ error: "Missing keyword" }), {
          status: 400,
          headers,
        });

      // Convert keyword and used sentences to traditional
      const keyword = s2tConverter(keywordRaw);
      const cleanUsed = used.map((u) => s2tConverter(u).replace(/[，。？！、\s]/g, ""));

      // Fetch 100 random rows containing the keyword
      const rows = await queryTurso(
        "SELECT dynasty, author, title, paragraphs FROM poems WHERE paragraphs LIKE '%' || ? || '%' ORDER BY RANDOM() LIMIT 100",
        [keyword]
      );

      let candidates = [];
      for (let row of rows) {
        if (!row[3] || !row[3].value) continue;
        const text = row[3].value;
        const sentences = text.split(/[，。？！\n]/);

        for (let s of sentences) {
          const cleanS = s.trim();
          if (cleanS.length >= 4 && cleanS.includes(keyword)) {
            const strippedS = cleanS.replace(/[，。？！、\s]/g, "");
            
            let isUsed = false;
            for (let u of cleanUsed) {
              if (u && strippedS.includes(u)) {
                isUsed = true;
                break;
              }
            }

            if (!isUsed) {
              const dynasty = t2sConverter(row[0]?.value || "");
              const author = t2sConverter(row[1]?.value || "");
              const title = t2sConverter(row[2]?.value || "");
              candidates.push({
                text: cleanS,
                source: `[${dynasty}] ${author}《${title}》`
              });
            }
          }
        }
      }

      if (candidates.length > 0) {
        let chosen = candidates[Math.floor(Math.random() * candidates.length)];
        // Convert the traditional poem back to simplified for the user
        chosen.text = t2sConverter(chosen.text);
        return new Response(JSON.stringify({ poem: chosen.text, source: chosen.source }), { headers });
      } else {
        return new Response(JSON.stringify({ poem: null }), { headers });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
}