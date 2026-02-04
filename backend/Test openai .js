import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log("\n🧪 OPENAI CONNECTION TEST\n");
console.log("=" .repeat(50));

// Check if API key exists
if (!OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY not found in environment");
  console.error("💡 Add it to your .env file:");
  console.error("   OPENAI_API_KEY=sk-proj-xxxxx");
  process.exit(1);
}

// Mask API key for display
const maskedKey = `${OPENAI_API_KEY.substring(0, 10)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`;
console.log(`✅ API Key found: ${maskedKey}\n`);

async function testOpenAI() {
  try {
    console.log("📡 Testing OpenAI API connection...\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Respond with a short confirmation message."
          },
          {
            role: "user",
            content: "Say 'OpenAI connection successful!' if you can read this."
          }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:");
      console.error(JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json();

    console.log("✅ CONNECTION SUCCESSFUL!\n");
    console.log("📊 Response Details:");
    console.log("─".repeat(50));
    console.log(`Model: ${data.model}`);
    console.log(`Response: ${data.choices[0].message.content}`);
    console.log(`Tokens Used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    console.log(`Finish Reason: ${data.choices[0].finish_reason}`);
    console.log("─".repeat(50));
    console.log("\n✅ OpenAI is working correctly!\n");

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes("fetch")) {
      console.error("\n💡 Possible issues:");
      console.error("   - Check your internet connection");
      console.error("   - Verify proxy settings if behind a firewall");
    } else if (error.message.includes("401")) {
      console.error("\n💡 API Key issue:");
      console.error("   - Check if your API key is correct");
      console.error("   - Verify your OpenAI account is active");
    } else if (error.message.includes("429")) {
      console.error("\n💡 Rate limit:");
      console.error("   - You've exceeded your rate limit");
      console.error("   - Wait a few moments and try again");
    }
    
    process.exit(1);
  }
}

// Run the test
testOpenAI();