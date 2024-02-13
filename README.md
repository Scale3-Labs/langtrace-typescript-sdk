## Steps to run
```
npm install
npm run build && npm run start 
```

Entrypoint - index.ts

Schema
```
{
  traceId: '75cd2a335b97751061f4789fc76233fa',
  parentId: undefined,
  traceState: undefined,
  name: 'openai.chat.completion.create',
  id: 'ca1c32dca6064397',
  kind: 1,
  timestamp: 1707787232707000,
  duration: 1452801.458,
  attributes: {
    service_provider: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    api: '/chat/completions',
    model: 'gpt-4',
    'request.maxRetries': 2,
    'request.timeout': 600000,
    'request.prompts': '[{"role":"user","content":"Say this is a test 3 times"},{"role":"assistant","content":"This is a test. This is a test. This is a test."},{"role":"user","content":"Say this is a mock 4 times"}]',
    'response.responses': '[{"role":"assistant","content":"This is a mock. This is a mock. This is a mock. This is a mock."}]',
    token_counts: '{"prompt_tokens":16,"completion_tokens":20,"total_tokens":66}'
  },
  status: { code: 1 },
  events: [],
  links: []
}
```