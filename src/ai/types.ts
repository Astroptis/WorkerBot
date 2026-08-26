export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnySearchResult {
  title: string;
  url: string;
  snippet: string;
  content: string;
}

export interface AnySearchResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    results: AnySearchResult[];
    metadata: {
      total_results: number;
      search_time_ms: number;
    };
  };
}
