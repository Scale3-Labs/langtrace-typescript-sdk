export const APIS = {
  CHAT: {
    METHOD: 'cohere.chat',
    API: '/v1/chat'
  },
  CHAT_STREAM: { METHOD: 'cohere.chatStream' },
  EMBED: { METHOD: 'cohere.embed', API: '/v1/embed' },
  EMBED_JOBS: { METHOD: 'cohere.embedJobs.create', API: '/v1/embed-jobs' },
  RERANK: { METHOD: 'cohere.rerank', API: '/v1/rerank' }
}
