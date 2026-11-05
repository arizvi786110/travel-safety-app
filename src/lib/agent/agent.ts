import {
  buildExtractionPrompt,
  buildGeneralPrompt,
  buildResponsePrompt,
  buildRoutingPrompt,
} from "./prompts";
import {
  findFlightRoute,
  getGoingAnywaysInfo,
  getLocationInfo,
  manageFavourites,
} from "./tools";

import { ChatGroq } from "@langchain/groq";
import { supabase } from "@/lib/auth/supabase";

const escapeLike = (v: string) => v.replace(/[\\%_]/g, "\\$&");

export const llm = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0.2,
  apiKey: process.env.GROQ_API_KEY,
  maxTokens: 700,
  maxRetries: 1,
});

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AgentState = {
  query: string;
  authToken: string | null;
  history: ChatMessage[];
  toolUsed: string | null;
  extractedArgs: string | null;
  rawResult: any;
  formattedResult: any;
  error: string | null;
};

function formatHistory(history: ChatMessage[]): string {
  if (history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") {
          return block;
        }
        if (
          block &&
          typeof block === "object" &&
          "text" in block &&
          typeof (block as { text?: unknown }).text === "string"
        ) {
          return (block as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  if (
    content &&
    typeof content === "object" &&
    "text" in content &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return (content as { text: string }).text.trim();
  }

  return String(content ?? "").trim();
}

async function receiveInput(state: AgentState): Promise<AgentState> {
  return {
    ...state,
    query: state.query,
    authToken: state.authToken,
    toolUsed: null,
    extractedArgs: null,
    rawResult: null,
    formattedResult: null,
    error: null,
  };
}

async function routeQuery(state: AgentState): Promise<AgentState> {
  try {
    const conversationContext = formatHistory(state.history);
    const prompt = buildRoutingPrompt(state.query, conversationContext);
    const response = await llm.invoke(prompt);
    let toolChoice = normalizeContent(response.content).toLowerCase();

    const validTools = [
      "location_info",
      "flight_route",
      "favourites",
      "going_anyway",
      "general",
    ];
    if (!validTools.includes(toolChoice)) {
      toolChoice = validTools.find((t) => toolChoice.includes(t)) ?? "general";
    }
    console.log("Final tool choice:", toolChoice);
    return { ...state, toolUsed: toolChoice };
  } catch (err) {
    console.error("Routing error details:", err);
    return { ...state, error: "Routing failed" };
  }
}

async function extractArgs(state: AgentState): Promise<AgentState> {
  if (state.toolUsed === "general" || !state.toolUsed) {
    return state;
  }
  try {
    const conversationContext = formatHistory(state.history);
    const prompt = buildExtractionPrompt(
      state.query,
      state.toolUsed,
      conversationContext,
    );
    const response = await llm.invoke(prompt);
    return { ...state, extractedArgs: normalizeContent(response.content) };
  } catch (err) {
    return { ...state, error: "Argument extraction failed" };
  }
}

async function callTool(state: AgentState): Promise<AgentState> {
  try {
    if (state.toolUsed === "location_info") {
      const args = JSON.parse(state.extractedArgs ?? "{}");

      const city = args.location;

      if (!city) {
        return { ...state, error: "No location was provided" };
      }
      const result = await getLocationInfo(city, state.authToken ?? undefined);
      console.log("getLocationInfo result:", JSON.stringify(result));
      return { ...state, rawResult: result };
    }

    if (state.toolUsed === "flight_route") {
      const args = JSON.parse(state.extractedArgs ?? "{}");
      const source = args.source;
      const destination = args.destination;
      if (!source || !destination) {
        return { ...state, error: "Missing flight source or destination" };
      }
      const result = await findFlightRoute(source, destination, state.authToken ?? undefined);
      return { ...state, rawResult: result };
    }
        if (state.toolUsed === "favourites") {
      const args = JSON.parse(state.extractedArgs ?? "{}");
      const action = args.action;

      if (!action) {
        return { ...state, error: "No favourites action was provided" };
      }

      if (action === "view") {
        const result = await manageFavourites("view", state.authToken ?? "");
        return { ...state, rawResult: result };
      }

      if (action === "add" || action === "remove") {
        if (!args.location) {
          return { ...state, error: "No location was provided" };
        }

        const { data: matches } = await supabase
          .from("location")
          .select("location_id, city")
          .ilike("city", escapeLike(String(args.location)))
          .limit(1);
        const found = matches?.[0];

        if (!found) {
          return {
            ...state,
            rawResult: {
              error: `"${args.location}" isn't in the app yet. Search for it on the destination screen first, then try again.`,
            },
          };
        }

        const validSeasons = ["now", "summer", "winter", "spring", "autumn"];
        const requested = String(args.season ?? "").toLowerCase();
        const season = validSeasons.includes(requested) ? requested : undefined;

        const result = await manageFavourites(
          action,
          state.authToken ?? "",
          found.location_id,
          action === "add" ? (season ?? "now") : season,
        );
        return { ...state, rawResult: result };
      }

      return { ...state, error: "Invalid favourites action" };
    }

    if (state.toolUsed === "going_anyway") {
      const args = JSON.parse(state.extractedArgs ?? "{}");
      const city = args.location;
      if (!city) {
        return { ...state, error: "No destination was provided" };
      }
      const result = await getGoingAnywaysInfo(city, state.authToken ?? undefined);
      return { ...state, rawResult: result };
    }
    if (state.toolUsed === "general") {
      const conversationContext = formatHistory(state.history);
      const prompt = buildGeneralPrompt(state.query, conversationContext);
      const response = await llm.invoke(prompt);
      return {
        ...state,
        rawResult: { answer: normalizeContent(response.content) },
      };
    }
    return { ...state, error: "Could not determine which tool to use" };
  } catch (err) {
    console.error("Tool call error details:", err);
    return { ...state, error: "Tool call failed" };
  }
}

async function formatResponse(state: AgentState): Promise<AgentState> {
  if (state.error) {
    return {
      ...state,
      formattedResult:
        "Sorry I couldn't complete that request. " + state.error + ".",
    };
  }
  if (state.toolUsed === "general" && state.rawResult?.answer) {
    return { ...state, formattedResult: state.rawResult.answer };
  }

  if (!state.rawResult) {
    return { ...state, formattedResult: "I'm not sure how to help with that" };
  }
  try {
    const conversationContext = formatHistory(state.history);
    const prompt = buildResponsePrompt(
      state.query,
      state.toolUsed,
      state.rawResult,
      conversationContext,
    );
    const response = await llm.invoke(prompt);
    return { ...state, formattedResult: normalizeContent(response.content) };
  } catch (error) {
    console.error("Response formatting error:", error);
    return {
      ...state,
      formattedResult: "Sorry, I had trouble putting that response together.",
    };
  }
}

export async function runAgent(
  query: string,
  authToken: string | null,
  history: ChatMessage[] = [],
) {
  let state: AgentState = {
    query,
    authToken,
    history,
    toolUsed: null,
    extractedArgs: null,
    rawResult: null,
    formattedResult: null,
    error: null,
  };
  state = await receiveInput(state);
  state = await routeQuery(state);
  if (!state.error) {
    state = await extractArgs(state);
  }
  if (!state.error) {
    state = await callTool(state);
  }
  state = await formatResponse(state);

  return {
    message: state.formattedResult ?? "I'm not sure how to respond to that.",
    toolUsed: state.toolUsed,
  };
}
