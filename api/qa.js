export const config = { runtime: 'edge' };

const ALLOWED = [
  'https://denrod25-del.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const SYSTEM = `You are an expert C systems programmer embedded in the Mastering C course. You answer learner questions clearly and concisely, grounding every claim in ISO/IEC 9899 (C11/C23), POSIX.1-2017, or the SysV AMD64 ABI where relevant.

The course covers: pointers and memory, virtual address space, stack frames, types and data layout (two's complement, IEEE 754, alignment, padding), preprocessor and build system (macros, X-macros, linkage, Make), undefined behaviour and compiler exploitation, the full C standard library (all 31 standard headers), systems programming (syscalls, file descriptors, fork/exec, pipes, signals, sockets, epoll, mmap, MMIO), concurrency (mutexes, condvars, C11 memory model, six memory orderings, CAS, ABA problem, TSan, TLS, pthreads), toolchain and debugging (GDB, core dumps, Valgrind, ASan/UBSan, strace, perf, flame graphs, GDB remote/OpenOCD), and data structures (dynamic array, intrusive lists, SPSC ring buffer, Robin Hood hashing, AVL tree, binary heap, trie, memory pools).

Rules:
- Keep answers under 120 words unless a code example genuinely requires more
- Use backtick inline code for identifiers and short snippets
- Use a fenced code block only when a multi-line example is necessary
- Lead with the direct answer, then explain
- Cite the relevant standard section when the answer depends on a spec rule (e.g. "C11 §6.5.7")
- If the question is outside C/systems programming, redirect politely`;

function cors(req) {
  const origin = req.headers.get('origin') || '';
  return {
    'access-control-allow-origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors(req) });

  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not set' }), {
      status: 500, headers: { 'content-type': 'application/json', ...cors(req) },
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json', ...cors(req) } }); }

  const { question, volume } = body;
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: 'question is required' }), {
      status: 400, headers: { 'content-type': 'application/json', ...cors(req) },
    });
  }

  const systemPrompt = SYSTEM + (volume ? `\n\nThe learner is currently viewing: "${volume}".` : '');

  const upstream = await fetch('https://llm-gateway.assemblyai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: key, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 400,
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return new Response(JSON.stringify({ error: 'LLM Gateway failed', detail }), {
      status: 502, headers: { 'content-type': 'application/json', ...cors(req) },
    });
  }

  const data = await upstream.json();
  const answer = data.choices?.[0]?.message?.content?.trim() ?? 'No answer returned.';

  return new Response(JSON.stringify({ answer }), {
    headers: { 'content-type': 'application/json', ...cors(req) },
  });
}
