import axios from "axios";

export const askAi = async (messages) => {
  try {
    // 🔍 Debug (remove later)
    console.log("API KEY:", process.env.OPENROUTER_API_KEY);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is empty.");
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo", // safer model
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      throw new Error("AI returned empty response.");
    }

    return content;
  } catch (error) {
    console.error("❌ OpenRouter Error:", error.response?.data || error.message);
    throw new Error("OpenRouter API Error");
  }
};