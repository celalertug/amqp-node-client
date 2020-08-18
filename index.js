const { v4 } = require('uuid');
const amqplib = require('amqplib');

// const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));

const responseBuilder = (code = 200, success = true, message = '', data = {}) => ({
  code,
  success,
  message,
  data,
});

const connect = async (host) => {
  const conn = await amqplib.connect(`amqp://${host}`);
  conn.on('close', () => {
    process.exit(0);
  });
  conn.on('error', () => {
    process.exit(0);
  });

  return conn;
};

const createChannel = async (connection) => {
  const channel = await connection.createChannel();
  channel.on('close', () => {
    process.exit(0);
  });
  channel.on('error', () => {
    process.exit(0);
  });
  return channel;
};

const sendToQueue = async (channel, queue, msgStr, options) => {
  await channel.sendToQueue(queue, Buffer.from(msgStr), options);
};

const consume = async (channel, exchange, topic, queue = '', cb = async () => {
}, options) => {
  const prefetchCount = options?.prefetchCount || 100;

  const q = await channel.assertQueue(queue, {
    autoDelete: true,
    durable: true,
  });
  const e = await channel.assertExchange(exchange, 'topic');

  await channel.bindQueue(queue, exchange, topic);
  await channel.prefetch(prefetchCount);
  await channel.consume(queue, async (msg) => {
    await cb(msg, channel);
    await channel.ack(msg);
  }, { noAck: false });

  return {
    q,
    e,
  };
};

const simpleConsume = async (channel, exchange, topic, queue = '', cb = async () => {
}, options) => consume(channel, exchange, topic, queue, async (msg) => {
  const { replyTo, correlationId } = msg.properties;
  const res = await cb(msg.content.toString(), channel, msg.properties);

  if (replyTo) {
    await sendToQueue(channel, replyTo, res, { correlationId });
  }
}, options);

const rpcRequestStandAlone = async (
  host, exchange, topic, msgStr, timeout = 0, responseInfo = () => {
  }) => {
  let connection;
  let channel;
  try {
    connection = await amqplib.connect(`amqp://${host}`);
    channel = await connection.createChannel();
  } catch (err) {
    return null;
  }

  const q = await channel.assertQueue('', {
    autoDelete: true,
    durable: true,
    exclusive: true,
  });

  const correlationId = v4();
  responseInfo({
    replyTo: q.queue,
    correlationId,
  });

  let timeoutHandler = null;
  const ret = new Promise((resolve, reject) => {
    if (timeout > 0) {
      timeoutHandler = setTimeout(async () => {
        // console.log('rejected');
        await channel.close();
        await connection.close();
        reject(new Error('timeout'));
      }, timeout);
    }
    channel.consume(q.queue, async (msg) => {
      if (msg.properties.correlationId === correlationId) {
        if (timeoutHandler !== null) {
          clearTimeout(timeoutHandler);
        }
        await channel.ack(msg);
        await channel.close();
        await connection.close();
        resolve(msg);
      }
    }, {
      noAck: false,
    });
  });

  await channel.publish(exchange, topic, Buffer.from(msgStr),
    {
      replyTo: q.queue,
      correlationId,
      persisted: true,
      mandatory: false,
    });

  return ret;
};

const fireAndForget = async (channel, exchange, topic, msgStr) => {
  await channel.publish(exchange, topic, Buffer.from(msgStr));
};

const fireAndForgetStandAlone = async (host, exchange, topic, msgStr) => {
  let connection;
  let channel;
  try {
    connection = await amqplib.connect(`amqp://${host}`);
    channel = await connection.createChannel();
    await channel.publish(exchange, topic, Buffer.from(msgStr));
    await channel.close();
    await connection.close();
  } catch (err) {
    return false;
  }
  return true;
};

const ServiceCreator = async (host, exchange) => {
  const connection = await connect(host);
  const channel = await createChannel(connection);

  return {
    connection,
    channel,
    responseBuilder,
    consume: (topic, queue, cb = () => {
    }, options) => consume(
      channel, exchange, topic, queue, cb, options,
    ),
    simpleConsume: (topic, queue, cb = () => {
    }, options) => simpleConsume(
      channel, exchange, topic, queue, cb, options,
    ),
    rpcRequest: (topic, msgStr, timeout = 0, responseInfo = () => {
    }) => rpcRequestStandAlone(
      host, exchange, topic, msgStr, timeout, responseInfo,
    ),
    sendToQueue: (queue, msgStr, options) => sendToQueue(channel, queue, msgStr, options),
    fireAndForget: (topic, msgStr) => fireAndForget(channel, exchange, topic, msgStr),
    rpcRequestStandAlone,
    fireAndForgetStandAlone,
    close: () => {
      channel.close();
      connection.close();
    },
    purgeAndClose: async () => {
      await channel.deleteExchange(exchange);
      channel.close();
      connection.close();
    },
  };
};

module.exports = {
  connect,
  createChannel,
  consume,
  simpleConsume,
  rpcRequestStandAlone,
  fireAndForget,
  fireAndForgetStandAlone,
  responseBuilder,
  ServiceCreator,
};
