import { init } from "@langtrace-init/init";
import { withLangTraceRootSpan } from "@langtrace-utils/instrumentation";
import dotenv from "dotenv";
dotenv.config();

init({
  batch: false,
  log_spans_to_console: true,
  write_to_remote_url: false,
});

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function basic() {
  withLangTraceRootSpan(async () => {
    const message = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello, Claude" }],
      model: "claude-3-opus-20240229",
      stream: true,
    });

    // console.log(message.content);
    for await (const part of message) {
      console.log(part);
    }
  });
}
