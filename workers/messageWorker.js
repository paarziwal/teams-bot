const { Worker } = require('bullmq');
const { ConfigurationBotFrameworkAuthentication, CloudAdapter } = require('botbuilder');
const { EchoBot } = require('../bot'); 
const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');
const Redis = require('ioredis');// adjust import as needed

const dotenv = require('dotenv');
dotenv.config();

const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

console.log(process.env.MicrosoftAppId);
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);
const adapter = new CloudAdapter(botFrameworkAuthentication);
const bot = new EchoBot();

const worker = new Worker('teams-messages', async (job) => {
  console.log('🚀 Job received:', job.id);

  const { body, headers } = job.data;

  const mockReq = httpMocks.createRequest({
    method: 'POST',
    url: '/api/messages',
    headers,
    body
  });

  const mockRes = httpMocks.createResponse({ eventEmitter: EventEmitter });


  try {
    await adapter.process(mockReq, mockRes, async (context) =>  bot.run(context));
  } catch (err) {
    console.error('❌ Error in processing message:', err);
    throw err;
  }
}, { connection });
