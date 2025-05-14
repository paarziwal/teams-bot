import { SQSClient } from "@aws-sdk/client-sqs";

let sqsClient = null;

export async function getSqsClient() {
  if (!sqsClient) {
    console.info("Creating new SQS client");
    sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
    console.info("SQS client created successfully");
  }
  return sqsClient;
}