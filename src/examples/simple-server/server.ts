import { setupInstrumentation } from "../setup";

setupInstrumentation();

import dotenv from "dotenv";
import * as http from "http";
import OpenAI from "openai";
import withLangTraceRootSpan from "../../instrumentation/with-root-span";

dotenv.config();
const hostname = "127.0.0.1";
const port = 3000;
const openai = new OpenAI();

const server = http.createServer(async (req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204); // No Content
    res.end();
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  withLangTraceRootSpan(async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "user", content: "Say this is a test 3 times" },
        {
          role: "assistant",
          content: "This is a test. This is a test. This is a test.",
        },
        { role: "user", content: "Say this is a mock 4 times" },
      ],
    });
  });
  console.log("here2");
  // console.log(completion.choices[0]);
  res.end("Hello World\n");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
