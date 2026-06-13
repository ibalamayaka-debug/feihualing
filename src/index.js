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

      const cleanSentence = sentence.replace(/[，。？！、\s]/g, "");
      const prefix = cleanSentence.substring(0, 4);

      const rows = await queryTurso(
        "SELECT paragraphs FROM poems WHERE paragraphs LIKE '%' || ? || '%' LIMIT 10",
        [prefix]
      );

      let exists = false;
      for (let row of rows) {
        if (!row[0] || !row[0].value) continue;
        const text = row[0].value.replace(/[，。？！、\s]/g, "");
        if (text.includes(cleanSentence)) {
          exists = true;
          break;
        }
      }
      return new Response(JSON.stringify({ exists }), { headers });
    } else if (action === "computer") {
      const keyword = url.searchParams.get("keyword");
      const usedStr = url.searchParams.get("used") || "";
      const used = usedStr ? usedStr.split(",") : [];

      if (!keyword)
        return new Response(JSON.stringify({ error: "Missing keyword" }), {
          status: 400,
          headers,
        });

      const rows = await queryTurso(
        "SELECT paragraphs FROM poems WHERE paragraphs LIKE '%' || ? || '%' ORDER BY RANDOM() LIMIT 30",
        [keyword]
      );

      let candidates = [];
      for (let row of rows) {
        if (!row[0] || !row[0].value) continue;
        const text = row[0].value;
        const sentences = text.split(/[，。？！\n]/);

        for (let s of sentences) {
          const cleanS = s.trim();
          if (cleanS.length >= 4 && cleanS.includes(keyword)) {
            const strippedS = cleanS.replace(/[，。？！、\s]/g, "");
            const cleanUsed = used.map((u) => u.replace(/[，。？！、\s]/g, ""));

            let isUsed = false;
            for (let u of cleanUsed) {
              if (u && strippedS.includes(u)) {
                isUsed = true;
                break;
              }
            }

            if (!isUsed) {
              candidates.push(cleanS);
            }
          }
        }
      }

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        return new Response(JSON.stringify({ poem: chosen }), { headers });
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