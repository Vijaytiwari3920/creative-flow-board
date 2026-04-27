// AI Chat function with tool-calling for managing the user's Kanban board.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's tasks. Optionally filter by column status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["todo", "in_progress", "review", "done"],
            description: "Optional column filter.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the user's board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title (required)." },
          description: { type: "string", description: "Optional longer description." },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "review", "done"],
            description: "Column to place the task in. Defaults to 'todo'.",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Defaults to 'medium'.",
          },
          due_date: {
            type: "string",
            description: "Due date in YYYY-MM-DD format. Optional.",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_task",
      description:
        "Move an existing task to a different column. Find the task by partial title match (case-insensitive).",
      parameters: {
        type: "object",
        properties: {
          title_query: {
            type: "string",
            description: "Substring of the task's title to identify it.",
          },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "review", "done"],
            description: "Target column.",
          },
        },
        required: ["title_query", "status"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const incoming: ChatMessage[] = body.messages ?? [];

    // Build context: include current task summary in system prompt so the model can answer
    // simple questions even without calling tools.
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, due_date")
      .order("status")
      .order("position");

    const today = new Date().toISOString().slice(0, 10);
    const boardSummary = (tasks ?? [])
      .map((t) => `- [${t.status}] (${t.priority}) ${t.title}${t.due_date ? ` — due ${t.due_date}` : ""}`)
      .join("\n");

    const systemPrompt = `You are Tazkee, a friendly and concise AI assistant inside a Kanban board app.

Today's date: ${today}.

The user has these columns: To Do (todo), In Progress (in_progress), Review (review), Done (done).
Priorities: low, medium, high.

Current board state:
${boardSummary || "(empty)"}

Guidelines:
- When the user asks you to add, create, or move tasks, USE THE TOOLS provided.
- For simple questions about the board ("what's overdue", "summarize", counts), answer directly using the board state above.
- Be concise. Use markdown lists when helpful.
- After successfully calling a tool, briefly confirm what you did in one short sentence.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...incoming,
    ];

    // Tool-calling loop (max 4 iterations to prevent runaway)
    for (let i = 0; i < 4; i++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Cloud workspace settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("AI gateway error", aiResp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      if (!message) {
        return new Response(JSON.stringify({ error: "No response from AI" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({
            content: message.content ?? "",
            actions: collectActions(messages),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Append the assistant message with tool calls
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      // Execute each tool call
      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(supabase, user.id, tc.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    // If we exit the loop without a final answer
    return new Response(
      JSON.stringify({ content: "I'm having trouble completing that. Could you rephrase?", actions: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ActionLog {
  type: "created" | "moved" | "listed";
  detail: string;
}

function collectActions(messages: ChatMessage[]): ActionLog[] {
  const actions: ActionLog[] = [];
  for (const m of messages) {
    if (m.role !== "tool" || !m.content) continue;
    try {
      const parsed = JSON.parse(m.content);
      if (parsed.action) actions.push(parsed.action);
    } catch {/* skip */}
  }
  return actions;
}

async function executeTool(supabase: any, userId: string, name: string, args: any) {
  if (name === "list_tasks") {
    let q = supabase.from("tasks").select("id, title, status, priority, due_date").order("status").order("position");
    if (args.status) q = q.eq("status", args.status);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { tasks: data };
  }

  if (name === "create_task") {
    if (!args.title || typeof args.title !== "string") {
      return { error: "title is required" };
    }
    const status = args.status ?? "todo";
    const { data: existing } = await supabase
      .from("tasks")
      .select("position")
      .eq("status", status)
      .order("position", { ascending: false })
      .limit(1);
    const position = (existing?.[0]?.position ?? 0) + 1000;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: args.title.trim(),
        description: args.description ?? null,
        status,
        priority: args.priority ?? "medium",
        due_date: args.due_date ?? null,
        position,
      })
      .select()
      .single();
    if (error) return { error: error.message };
    return { ok: true, task: data, action: { type: "created", detail: data.title } };
  }

  if (name === "move_task") {
    const { data: matches, error: findErr } = await supabase
      .from("tasks")
      .select("*")
      .ilike("title", `%${args.title_query}%`);
    if (findErr) return { error: findErr.message };
    if (!matches || matches.length === 0) return { error: `No task matches "${args.title_query}"` };
    if (matches.length > 1) {
      return {
        error: `Multiple tasks match "${args.title_query}": ${matches.map((m: any) => m.title).join(", ")}. Be more specific.`,
      };
    }
    const task = matches[0];

    const { data: existing } = await supabase
      .from("tasks")
      .select("position")
      .eq("status", args.status)
      .order("position", { ascending: false })
      .limit(1);
    const position = (existing?.[0]?.position ?? 0) + 1000;

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: args.status, position })
      .eq("id", task.id)
      .select()
      .single();
    if (error) return { error: error.message };
    return {
      ok: true,
      task: data,
      action: { type: "moved", detail: `${task.title} → ${args.status}` },
    };
  }

  return { error: `Unknown tool: ${name}` };
}
