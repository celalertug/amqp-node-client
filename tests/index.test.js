const assert = require('assert');
const amqplib = require('amqplib');
const { range } = require('lodash');

const {
  consume, fireAndForget, rpcRequestStandAlone,
} = require('../index.js');

const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
}, ms);

// eslint-disable-next-line no-undef
describe('lib test', async () => {
  let connection;
  let channel;
  const EXCHANGE = 'test-exchange';
  const HOST = 'localhost';

  // eslint-disable-next-line no-undef
  before(async () => {
  // beforeEach(async () => {
    connection = await amqplib.connect(`amqp://${HOST}`);
    channel = await connection.createChannel();
  });

  // eslint-disable-next-line no-undef
  after(async () => {
  // afterEach(async () => {
  //   await wait(150);
    await channel.deleteExchange(EXCHANGE);
    await channel.close();
    await connection.close();
  });

  // eslint-disable-next-line no-undef
  it('should simple rfc', async () => {
    await consume(channel, EXCHANGE, 'math.sum', 'math_sum', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      await channel.sendToQueue(replyTo, Buffer.from(`hi ${msg.content.toString()}`), { correlationId });
    });

    const res = await rpcRequestStandAlone(HOST, EXCHANGE, 'math.sum', 'motherfucker');
    assert.deepStrictEqual(res.content.toString(), 'hi motherfucker');
  });

  // eslint-disable-next-line no-undef
  it('should simple rfc standalone', async () => {
    await consume(channel, EXCHANGE, 'math.sum', 'math_sum', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      await wait(100);
      await channel.sendToQueue(replyTo, Buffer.from(`hi ${msg.content.toString()}`), { correlationId });
    });

    const res = await rpcRequestStandAlone('localhost', EXCHANGE, 'math.sum', 'motherfucker');
    assert.deepStrictEqual(res.content.toString(), 'hi motherfucker');

    let e = false;
    try {
      await rpcRequestStandAlone('localhost', EXCHANGE, 'math.sum', 'motherfucker', 20);
    } catch (err) {
      e = true;
    }
    assert.deepStrictEqual(e, true);
  });

  // eslint-disable-next-line no-undef
  it('should multiple rfc', async () => {
    await consume(channel, EXCHANGE, 'math.multiply', 'math_mul', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const { a, b } = JSON.parse(msg.content.toString());

      await channel
        .sendToQueue(replyTo, Buffer.from(JSON.stringify({ result: a * b })), { correlationId });
    });

    const a = 7;
    const b = 4;
    const repeat = 50;

    const res = await Promise.all(range(repeat)
      .map((i) => rpcRequestStandAlone(HOST, EXCHANGE, 'math.multiply', JSON.stringify({
        a: a * i,
        b,
      }))));
    // console.log(res.map((i) => i.content.toString()));
    assert.deepStrictEqual(res.map((i) => JSON.parse(i.content.toString())), range(repeat)
      .map((i) => ({ result: a * b * i })));
  });

  // eslint-disable-next-line no-undef
  it('should chaining', async () => {
    await consume(channel, EXCHANGE, 'chain.math.ten-times', 'chain-math-ten-times', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const { a } = JSON.parse(msg.content.toString());

      await channel
        .sendToQueue(replyTo, Buffer.from(JSON.stringify({ result: a * 10 })), { correlationId });
    });
    await consume(channel, EXCHANGE, 'chain.math.square', 'chain-math-square', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const { a } = JSON.parse(msg.content.toString());

      let tenTimes = await rpcRequestStandAlone(HOST, EXCHANGE, 'chain.math.ten-times', JSON.stringify({ a }));
      tenTimes = JSON.parse(tenTimes.content.toString()).result;
      await channel
        .sendToQueue(replyTo,
          Buffer.from(JSON.stringify({ result: tenTimes * tenTimes })), { correlationId });
    });

    const res = await rpcRequestStandAlone(HOST, EXCHANGE, 'chain.math.square', JSON.stringify({ a: 5 }));
    // console.log(res.content.toString());
    assert.deepStrictEqual(JSON.parse(res.content.toString()), { result: 2500 });
  });

  // eslint-disable-next-line no-undef
  it('should fire and forget', async () => {
    await consume(channel, EXCHANGE, 'log.request', 'x-logger', async (msg) => {
      // console.log(msg.content.toString());
      assert.deepStrictEqual(msg.content.toString(), 'this is a log');
    });

    await fireAndForget(channel, EXCHANGE, 'log.request', 'this is a log');
    await wait(10);
  });

  // eslint-disable-next-line no-undef
  it('should multiple worker', async () => {
    let worker1Count = 0;
    let worker2Count = 0;

    await consume(channel, EXCHANGE, 'worker.math.ten-times', 'worker-math-ten-times', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const { a } = JSON.parse(msg.content.toString());
      // console.log('worker1', a);
      worker1Count += 1;

      await wait(150);

      await channel
        .sendToQueue(replyTo, Buffer.from(JSON.stringify({ result: a * 10 })), { correlationId });
    });
    await consume(channel, EXCHANGE, 'worker.math.ten-times', 'worker-math-ten-times', async (msg) => {
      const { replyTo, correlationId } = msg.properties;
      const { a } = JSON.parse(msg.content.toString());
      // console.log('worker2', a);
      worker2Count += 1;

      await wait(50);
      await channel
        .sendToQueue(replyTo, Buffer.from(JSON.stringify({ result: a * 10 })), { correlationId });
    });

    const res = await Promise.all(range(10)
      .map((i) => rpcRequestStandAlone(HOST, EXCHANGE, 'worker.math.ten-times', JSON.stringify({
        a: i + 1,
      }))));

    // console.log(worker2Count, worker1Count);
    assert.deepStrictEqual(worker2Count > worker1Count, true);

    // console.log(res.map((i) => JSON.parse(i.content.toString())));
    assert.deepStrictEqual(res.map((i) => JSON.parse(i.content.toString())), [
      { result: 10 },
      { result: 20 },
      { result: 30 },
      { result: 40 },
      { result: 50 },
      { result: 60 },
      { result: 70 },
      { result: 80 },
      { result: 90 },
      { result: 100 },
    ]);
  });

  // eslint-disable-next-line no-undef
  it('should response', async () => {
    const response = (code = 200, success = true, message = '', data = {}) => ({
      code, success, message, data,
    });

    let res = response();
    // console.log(res);
    assert.deepStrictEqual(res, {
      code: 200, success: true, message: '', data: {},
    });

    res = response(404, false, 'authentication failed');
    // console.log(res);
    assert.deepStrictEqual(res, {
      code: 404,
      success: false,
      message: 'authentication failed',
      data: {},
    });

    res = response(203, true, 'item created', { value: 123 });
    // console.log(res);
    assert.deepStrictEqual(res, {
      code: 203,
      success: true,
      message: 'item created',
      data: { value: 123 },
    });
  });
});
