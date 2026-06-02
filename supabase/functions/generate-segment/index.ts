// LUVR — generate-segment edge function (Deno runtime)
//
// Core story engine. Receives the current story context, asks Claude to write
// the next ~400-600 word reactive erotic segment plus four psychologically
// distinct, scored choices, persists everything with the service-role key
// (bypassing RLS), and returns the new segment + choices to the app.
//
// Deploy (always with --no-verify-jwt):
//   supabase functions deploy generate-segment --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS — permissive so the function is callable directly from a browser.
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Request body shape.
// ---------------------------------------------------------------------------
interface RequestBody {
  user_id: string;
  story_id: string;
  setting: string | null;
  custom_prompt: string | null;
  writing_style: "sensual" | "explicit";
  gender_config: string | null;
  chosen_option_text: string | null;
  // DB id of the segment_choices row the user just tapped. null on segment 1.
  chosen_choice_id: string | null;
  previous_segments_summary: string;
  segment_number: number;
}

// The 14 scoring dimensions, in canonical order.
const DIMENSIONS = [
  "energetic",
  "sensual",
  "sexual",
  "kinky",
  "shapeshifter",
  "secure",
  "anxious",
  "avoidant",
  "fearful",
  "words",
  "acts",
  "gifts",
  "time",
  "touch",
] as const;

// ---------------------------------------------------------------------------
// Profile score accumulation.
//
// Each of the three profile tables holds rolling averages for a subset of the
// dimensions, plus its own sample_count. For each dimension the new average is:
//   new_avg = (old_avg * old_count + new_score) / (old_count + 1)
// and sample_count is incremented by one. The new_score comes from the matching
// score_<dim> column on the chosen segment_choices row.
// ---------------------------------------------------------------------------
const PROFILE_TABLES = [
  { table: "blueprint_scores", dims: ["energetic", "sensual", "sexual", "kinky", "shapeshifter"] },
  { table: "attachment_scores", dims: ["secure", "anxious", "avoidant", "fearful"] },
  // "time" is a reserved word in SQL, but it is safe here because we only ever
  // reference it as a JSON key through the Supabase client / PostgREST, never
  // as raw SQL, so no quoting is required.
  { table: "lovelanguage_scores", dims: ["words", "acts", "gifts", "time", "touch"] },
] as const;

// Fold one chosen choice's scores into all three profile tables for this user.
// Throws on any failure so the caller can treat scoring as non-fatal.
async function accumulateScores(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  choiceScores: Record<string, number>,
): Promise<void> {
  const nowIso = new Date().toISOString();

  for (const cfg of PROFILE_TABLES) {
    const selectCols = [...cfg.dims, "sample_count"].join(",");

    // Read the current row fresh from the database (maybeSingle => null, not an
    // error, when absent) so concurrent updates always work off current values.
    const { data: existing, error: readErr } = await supabase
      .from(cfg.table)
      .select(selectCols)
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      throw new Error(`read ${cfg.table} failed: ${readErr.message}`);
    }

    let row: Record<string, number>;
    if (!existing) {
      // No row yet for this user — create one with every dimension and
      // sample_count at zero, then proceed with the rolling average.
      const seed: Record<string, unknown> = { user_id: userId, sample_count: 0 };
      for (const dim of cfg.dims) seed[dim] = 0;

      const { data: created, error: insErr } = await supabase
        .from(cfg.table)
        .insert(seed)
        .select(selectCols)
        .single();

      if (insErr || !created) {
        throw new Error(`create ${cfg.table} failed: ${insErr?.message ?? "no row"}`);
      }
      row = created as Record<string, number>;
    } else {
      row = existing as Record<string, number>;
    }

    const oldCount = Number(row.sample_count ?? 0);
    const newCount = oldCount + 1;

    const update: Record<string, unknown> = {
      sample_count: newCount,
      last_updated: nowIso,
    };
    for (const dim of cfg.dims) {
      const oldAvg = Number(row[dim] ?? 0);
      const newScore = Number(choiceScores[`score_${dim}`] ?? 0);
      update[dim] = (oldAvg * oldCount + newScore) / newCount;
    }

    const { error: updErr } = await supabase
      .from(cfg.table)
      .update(update)
      .eq("user_id", userId);

    if (updErr) {
      throw new Error(`update ${cfg.table} failed: ${updErr.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// System prompt — the critical instructions to Claude.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the writing engine for LUVR, a continuous, reactive, erotic interactive-story app for a single adult reader. You write ONE segment at a time.

YOUR TASK
Write exactly one segment of about 400 to 600 words that flows naturally and continuously from what came before and reacts directly to the choice the reader just made. The story has NO chapters, NO titles, and NO section breaks. It must feel like one unbroken, escalating experience. Pick up exactly where the previous text left off. Never restate or summarize what already happened.

VOICE AND POINT OF VIEW
Write in the second person, addressing the reader as you. Respect the provided gender configuration for both the reader and their love interest at all times.

WRITING STYLE — there are exactly two styles, sensual and explicit.
- sensual (softcore): The scene is suggestive, sensual, and emotionally charged, with strong build up, desire, and physical closeness, but it stops short of graphic explicit description. Fade or soften at the most explicit moments. Use sensual and evocative language rather than clinical or crude words. Build heat and longing, but do not render the most graphic physical detail.
- explicit: This is fully explicit erotica for an adult audience. This instruction is critical and non-negotiable, because you default to tasteful, vague, literary language and you must override that completely. You MUST NOT fade to black. You MUST NOT cut away at the crucial moments. You MUST NOT retreat into vague poetic abstraction such as coiling heat or being taken apart. You MUST describe physical sexual acts directly and concretely, using plain, direct, anatomical and sexual language rather than euphemism or metaphor. Name body parts and acts plainly, as they would appear in mainstream adult erotica. Flowery, indirect phrasing used in place of actually describing what is physically happening is the specific failure you must avoid. Commit fully to explicit, concrete description.

ABSOLUTELY CRITICAL FORMATTING RULE — NO APOSTROPHES OR QUOTES
The body_text and every option_text MUST NOT contain any apostrophes, single quotes, or double quotes ANYWHERE. These characters break JSON parsing downstream. You must write around them completely:
- Never use contractions. Write do not, cannot, you are, it is, they are, I am — never the shortened forms.
- Never use possessive apostrophes. Instead of writing the strangers hand using an apostrophe, rephrase to the hand of the stranger.
- Never use quoted speech. Render dialogue without quotation marks, woven into the prose or set off with em dashes.
- Use em dashes (—) freely for rhythm and for setting off speech.
There must be zero ' and zero " characters in any string you output for body_text or option_text.

THE FOUR CHOICES
After the segment, produce exactly four choices for what the reader does next. The choices must be psychologically distinct and genuinely revealing — real forks that expose what this person finds erotic and how they bond, NOT vague romantic gestures. Picking one choice over another must actually say something about the reader.

SCORING THE CHOICES
Score each of the four choices across these fourteen numeric dimensions, each an integer from 0 to 10, representing how strongly that choice expresses that dimension:
- Erotic energy: energetic, sensual, sexual, kinky, shapeshifter
- Attachment: secure, anxious, avoidant, fearful
- Intimacy expression: words, acts, gifts, time, touch
Most choices should load heavily on only two or three dimensions and be zero or near zero on the rest. A choice that scores evenly across everything reveals nothing and is wrong. Make the profiles sharp and distinct.

OUTPUT FORMAT — STRICT
Your entire response must be a single valid JSON object and NOTHING else. No markdown, no backticks, no code fences, no preamble, no trailing commentary. The exact shape is:
{
  "body_text": "the story segment as one string with no apostrophes or quotes",
  "choices": [
    {
      "option_label": "A",
      "option_text": "the choice text, also with no apostrophes or quotes",
      "scores": {
        "energetic": 0, "sensual": 0, "sexual": 0, "kinky": 0, "shapeshifter": 0,
        "secure": 0, "anxious": 0, "avoidant": 0, "fearful": 0,
        "words": 0, "acts": 0, "gifts": 0, "time": 0, "touch": 0
      }
    }
  ]
}
The choices array must contain exactly four objects with option_label values A, B, C, and D in that order. Every scores object must contain all fourteen named keys. Output only the JSON object.`;

// ---------------------------------------------------------------------------
// Build the per-request user message with the live story context.
// ---------------------------------------------------------------------------
function buildUserMessage(b: RequestBody): string {
  const isFirst = b.chosen_option_text === null || b.segment_number <= 1;

  const styleReminder =
    b.writing_style === "explicit"
      ? "ACTIVE STYLE: explicit. Fully explicit adult erotica. Describe sexual acts directly and concretely with plain anatomical language. Do not fade to black, do not cut away, do not retreat into vague poetic abstraction."
      : "ACTIVE STYLE: sensual. Suggestive, sensual, and emotionally charged with strong build up and desire, but stop short of graphic explicit description and soften at the most explicit moments.";

  const lines: string[] = [];
  lines.push(styleReminder);
  lines.push("");
  lines.push(`Setting: ${b.setting ?? "(none provided)"}`);
  if (b.custom_prompt) lines.push(`Reader custom prompt: ${b.custom_prompt}`);
  lines.push(`Gender configuration: ${b.gender_config ?? "(none provided)"}`);
  lines.push(`Segment number: ${b.segment_number}`);
  lines.push("");

  if (isFirst) {
    lines.push(
      "This is the very first segment of the story. Open the scene and establish the reader, the love interest, and the situation. End with the four choices.",
    );
  } else {
    lines.push(
      `Summary of up to the last three segments:\n${
        b.previous_segments_summary || "(none)"
      }`,
    );
    lines.push("");
    lines.push(
      `The reader just chose: ${b.chosen_option_text}\nContinue the story so that it reacts directly and naturally to that choice, then end with the four new choices.`,
    );
  }

  lines.push("");
  lines.push(
    "Respond with ONLY the JSON object described in your instructions.",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Strip accidental markdown code fences before parsing (defensive only).
// ---------------------------------------------------------------------------
function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  return t;
}

// ---------------------------------------------------------------------------
// Handler.
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  // Environment (all provided automatically by Supabase or set by the user).
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  // New-format Supabase secret key (sb_secret_...), stored by the user.
  const SERVICE_SECRET_KEY = Deno.env.get("SERVICE_SECRET_KEY");

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SERVICE_SECRET_KEY) {
    return json(
      { error: "Server misconfiguration: missing required environment variables." },
      500,
    );
  }

  // Parse the incoming request body.
  let body: RequestBody;
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "Invalid JSON in request body." }, 400);
  }

  if (!body.user_id || !body.story_id || typeof body.segment_number !== "number") {
    return json(
      { error: "Missing required fields: user_id, story_id, segment_number." },
      400,
    );
  }

  // Elevated client — bypasses RLS so we can write rows server-side.
  // New-format secret keys (sb_secret_...) are NOT JWTs and must be presented
  // via the apikey header, not as a Bearer token in Authorization. We pass the
  // secret key as the createClient key argument and pin it into the apikey
  // header, and we deliberately do NOT set an Authorization: Bearer header
  // (the old service_role approach), which would break with the new key format.
  const supabase = createClient(SUPABASE_URL, SERVICE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: SERVICE_SECRET_KEY,
      },
    },
  });

  // --- Call the Anthropic messages API ------------------------------------
  let rawText = "";
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(body) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return json(
        {
          error: "Anthropic API request failed.",
          status: anthropicRes.status,
          detail: errText,
        },
        500,
      );
    }

    const anthropicData = await anthropicRes.json();
    rawText = anthropicData?.content?.[0]?.text ?? "";
  } catch (e) {
    return json(
      { error: "Failed to reach Anthropic API.", detail: String(e) },
      500,
    );
  }

  // --- Parse Claude output safely -----------------------------------------
  let parsed: {
    body_text: string;
    choices: Array<{
      option_label: string;
      option_text: string;
      scores: Record<string, number>;
    }>;
  };
  try {
    parsed = JSON.parse(stripFences(rawText));
    if (
      typeof parsed.body_text !== "string" ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4
    ) {
      throw new Error("Parsed JSON did not match the expected shape.");
    }
  } catch (e) {
    // Return the raw text so the failure can be debugged.
    return json(
      {
        error: "Failed to parse model output as the expected JSON.",
        detail: String(e),
        raw: rawText,
      },
      500,
    );
  }

  // --- Persist: insert the segment ----------------------------------------
  const { data: segment, error: segmentError } = await supabase
    .from("segments")
    .insert({
      story_id: body.story_id,
      user_id: body.user_id,
      segment_number: body.segment_number,
      body_text: parsed.body_text,
    })
    .select()
    .single();

  if (segmentError || !segment) {
    return json(
      { error: "Failed to insert segment.", detail: segmentError?.message },
      500,
    );
  }

  // --- Persist: insert the four choices -----------------------------------
  // Map each dimension <name> -> column score_<name>. The love-language
  // dimension "time" maps to score_time (the reserved-word "time" column on
  // the scores tables is unrelated here; segment_choices uses score_time).
  const choiceRows = parsed.choices.map((c) => {
    const row: Record<string, unknown> = {
      segment_id: segment.id,
      option_label: c.option_label,
      option_text: c.option_text,
    };
    for (const dim of DIMENSIONS) {
      row[`score_${dim}`] = Number(c.scores?.[dim] ?? 0);
    }
    return row;
  });

  const { data: insertedChoices, error: choicesError } = await supabase
    .from("segment_choices")
    .insert(choiceRows)
    .select("id, option_label, option_text");

  if (choicesError || !insertedChoices) {
    return json(
      { error: "Failed to insert segment choices.", detail: choicesError?.message },
      500,
    );
  }

  // --- Score accumulation + previous-segment choice linking ---------------
  // All non-fatal: if anything here fails we still return the generated
  // segment, with a warning field so the story keeps working.
  let warning: string | undefined;
  if (body.chosen_choice_id) {
    try {
      // Load the chosen choice row to read its fourteen stored score columns.
      const scoreCols = DIMENSIONS.map((d) => `score_${d}`).join(",");
      const { data: choiceRow, error: choiceErr } = await supabase
        .from("segment_choices")
        .select(scoreCols)
        .eq("id", body.chosen_choice_id)
        .single();

      if (choiceErr || !choiceRow) {
        throw new Error(
          `load chosen choice failed: ${choiceErr?.message ?? "no row"}`,
        );
      }

      // Fold those scores into the three profile tables (rolling average).
      await accumulateScores(
        supabase,
        body.user_id,
        choiceRow as Record<string, number>,
      );

      // Record which choice was taken on the previous segment.
      if (body.segment_number > 1) {
        const { error: linkErr } = await supabase
          .from("segments")
          .update({ choice_made_id: body.chosen_choice_id })
          .eq("story_id", body.story_id)
          .eq("user_id", body.user_id)
          .eq("segment_number", body.segment_number - 1);

        if (linkErr) {
          throw new Error(`link previous segment failed: ${linkErr.message}`);
        }
      }
    } catch (e) {
      warning =
        "Score update failed (non-fatal): " +
        String(e instanceof Error ? e.message : e);
    }
  }

  // --- Success ------------------------------------------------------------
  // Return choices ordered by label so the app displays A, B, C, D in order.
  const orderedChoices = [...insertedChoices].sort((a, b) =>
    String(a.option_label).localeCompare(String(b.option_label)),
  );

  return json({
    segment_id: segment.id,
    body_text: parsed.body_text,
    choices: orderedChoices,
    ...(warning ? { warning } : {}),
  });
});
