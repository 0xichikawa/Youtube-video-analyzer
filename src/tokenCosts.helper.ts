import * as tiktoken from "tiktoken";
const INPUT_TOKEN_COST_PER_1K_TOKENS = 0.01;
const OUTPUT_TOKEN_COST_PER_1K_TOKENS = 0.03;

// Function to estimate tokens  
function estimateTokens(text: string): number {
    const tokenEncoder = tiktoken.encoding_for_model("gpt-4o");
    return tokenEncoder.encode(text).length;
}

export function calculateTokenCosts(prompt: string, result: string): number {
    //Calculate token costs for prompt and result
    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(result);

    // Calculate total cost in USD
    const cost = (inputTokens * INPUT_TOKEN_COST_PER_1K_TOKENS + outputTokens * OUTPUT_TOKEN_COST_PER_1K_TOKENS) / 1000;
    return cost;
}