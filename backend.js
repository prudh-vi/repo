import express from 'express';
import OpenAI from 'openai';
import cors from 'cors';
import bodyParser from 'body-parser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 5123;

// Store chat history and messages
let chatHistory = [];
let lastMessageId = 0;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Chat Safety Monitor Server is running");
});

// Get messages endpoint
app.get('/api/messages', (req, res) => {
  const afterId = parseInt(req.query.lastMessageId) || 0;
  const newMessages = chatHistory.filter(msg => msg.id > afterId);
  res.json({
    messages: newMessages,
    lastMessageId: lastMessageId
  });
});
app.delete('/api/messages/clear', (req, res) => {
  // Clear server-side chat history logic
  chatHistory = []; // Example: Reset chat history
  res.status(200).send({ message: 'Chat history cleared' });
});

// Send message endpoint
app.post('/api/messages', async (req, res) => {
  try {
    const { user, message } = req.body;
    
    // Create new message object
    const newMessage = {
      id: ++lastMessageId,
      user,
      message,
      timestamp: new Date(),
    };
    
    // Add message to chat history
    chatHistory.push(newMessage);

    // Check message safety
    const safetyAnalysis = await analyzeSafety(message);
    
    res.json({
      success: true,
      message: newMessage,
      safetyAnalysis
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function analyzeSafety(message) {
  console.log("Analyzing message safety:", message);
  
  const messages = [
    {
      "role": "system",
      "content": `You are a chat safety monitor. Your tasks:
        1. Analyze messages for personal information (names, addresses, phone numbers, etc.)
        2. Detect sensitive data (financial details, passwords)
        3. Detect bullying or put downing others by using vulgar or bad words
        4. Identify unsafe sharing practices
        5. Flag potentially harmful content
        6. If message is safe, respond with "SAFE"
        7. If unsafe, provide a brief specific warning about what information should not be shared and suggestions`
    },
    {
      "role": "user",
      "content": message
    }
  ];

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.3, // Lower temperature for more consistent safety checking
      max_tokens: 150, // Shorter responses for warnings
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("Safety analysis:", chat.choices[0].message.content);
    return chat.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log("Chat Safety Monitor Server started on port", port);
});
