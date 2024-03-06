// Initialize dotenv
import { init } from "@langtrace-init/init";
import { withLangTraceRootSpan } from "@langtrace-utils/instrumentation";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

init({
  write_to_remote_url: false,
  log_spans_to_console: true,
  batch: false,
});

export async function chatCompletion() {
  const openai = new OpenAI();

  withLangTraceRootSpan(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "user", content: "Say this is a test 3 times" },
        // {
        //   role: "assistant",
        //   content: "This is a test. This is a test. This is a test.",
        // },
        // { role: "user", content: "Say this is a mock 4 times" },
      ],
      stream: false,
    });

    console.log(response);

    // for await (const part of response) {
    //   process.stdout.write(part.choices[0]?.delta?.content || "");
    // }

    // const completion2 = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "user", content: "Say this is a test 3 times" },
    //     {
    //       role: "assistant",
    //       content: "This is a test. This is a test. This is a test.",
    //     },
    //     { role: "user", content: "Say this is a mock 4 times" },
    //   ],
    // });
  });
}
