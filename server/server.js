import "dotenv/config";
import app from "./app.js";
import { connectDatabase as connectDb } from "./config/db.js";
import { port as PORT } from "./config/env.js";
import { Badge } from "./models/Badge.js";

const defaultBadges = [
  { name: "First Steps", description: "Asked your first question", icon: "🌱", criteria: { type: "questionsAsked", threshold: 1 } },
  { name: "Curious Mind", description: "Asked 10 questions", icon: "💡", criteria: { type: "questionsAsked", threshold: 10 } },
  { name: "Helping Hand", description: "Answered your first question", icon: "🤝", criteria: { type: "answersGiven", threshold: 1 } },
  { name: "Top Contributor", description: "Answered 25 questions", icon: "⭐", criteria: { type: "answersGiven", threshold: 25 } },
  { name: "Rising Star", description: "Reached 50 reputation", icon: "🌟", criteria: { type: "reputation", threshold: 50 } },
  { name: "Expert", description: "Reached 500 reputation", icon: "👑", criteria: { type: "reputation", threshold: 500 } },
  { name: "Popular Answer", description: "Received 10 upvotes", icon: "🔥", criteria: { type: "upvotesReceived", threshold: 10 } },
  { name: "Frequently Bookmarked", description: "Had your FAQ saved 5 times", icon: "📌", criteria: { type: "savedCount", threshold: 5 } },
];

connectDb()
  .then(async () => {
    for (const badge of defaultBadges) {
      await Badge.updateOne({ name: badge.name }, { $setOnInsert: badge }, { upsert: true });
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(`Failed to connect: ${error.message}`);
    process.exit(1);
  });
