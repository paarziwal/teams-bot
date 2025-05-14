// services/SqsService.js
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({
  region: "us-east-2",
});

/**
 * Sends a message to an SQS queue with optional headers as message attributes.
 * @param {string} queueUrl 
 * @param {string} messageBody 
 * @param {Object} headers 
 */
async function sendMessageToQueue(queueUrl, messageBody, headers = {}) {
  const messageAttributes = {};
  let count = 0

  // Only include string headers (non-binary)
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      messageAttributes[key] = {
        DataType: "String",
        StringValue: value
      };
      count++;
    }
    if (count >= 10) break;
  }

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: messageBody,
    MessageAttributes: messageAttributes
  });

  await sqsClient.send(command);
}

module.exports = { sendMessageToQueue };