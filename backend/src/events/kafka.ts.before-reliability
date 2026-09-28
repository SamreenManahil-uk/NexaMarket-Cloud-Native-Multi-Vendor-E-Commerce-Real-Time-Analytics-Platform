import { Kafka, type Producer } from "kafkajs";

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? "nexamarket-api",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9094")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
});

let producer: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
  if (producer) return producer;

  producer = kafka.producer({
    allowAutoTopicCreation: false,
  });

  await producer.connect();
  return producer;
}

export async function publishKafkaEvent(
  topic: string,
  key: string,
  payload: unknown,
): Promise<void> {
  const activeProducer = await getKafkaProducer();

  await activeProducer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(payload),
      },
    ],
  });
}

export async function disconnectKafka(): Promise<void> {
  if (!producer) return;

  await producer.disconnect();
  producer = null;
}
