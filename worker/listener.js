// listener.js
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { ConfigurationBotFrameworkAuthentication, CloudAdapter } = require('botbuilder');
const { EchoBot } = require('../bot');
const httpMocks = require('node-mocks-http');
const { EventEmitter } = require('events');
const dotenv = require('dotenv');

dotenv.config();

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const queueUrl = process.env.AWS_SQS_INCOMING_QUEUE_URL;

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);
const adapter = new CloudAdapter(botFrameworkAuthentication);

const myBot = new EchoBot();
async function pollMessages() {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      MessageAttributeNames: ['All']
    });

    const { Messages } = await sqsClient.send(command);

    if (Messages) {
      for (const message of Messages) {
        try {
          let parsed;
          try {
            parsed = JSON.parse(message.Body);
          } catch (err) {
            console.error('❌ Error parsing message body:', err);
            continue;
          }

          const headers = {};
          if (message.MessageAttributes) {
            for (const [key, attr] of Object.entries(message.MessageAttributes)) {
              headers[key.toLowerCase()] = attr.StringValue;
            }
          }

          const mockReq = httpMocks.createRequest({
            method: 'POST',
            url: '/api/messages',
            headers,
            body: parsed.body
          });

          const mockRes = httpMocks.createResponse({ eventEmitter: EventEmitter });

          await adapter.process(mockReq, mockRes, async (context) => {
            await myBot.run(context);
          });

          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }));

        } catch (err) {
          console.error('❌ Error processing message:', err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error polling SQS:', err);
  }

  setTimeout(pollMessages, 100); // Poll again after 1 second
}

pollMessages();