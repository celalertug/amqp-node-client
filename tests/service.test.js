const assert = require('assert');

const amq = require('../index.js');

// eslint-disable-next-line no-unused-vars
const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
}, ms);

// eslint-disable-next-line no-undef
describe('service', () => {
  // eslint-disable-next-line no-undef
  it('should simple', async () => {
    const service = await amq.ServiceCreator('localhost', 'hebele');
    //
    await service.consume('request.echo', 'worker-queue', async (msg) => {
      const { replyTo, correlationId } = msg.properties;

      const res = service.responseBuilder(200, true, 'ok', JSON.parse(msg.content.toString()));
      if (replyTo) {
        await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
      }
    });

    const res = await service.rpcRequest('request.echo', JSON.stringify({ message: 'surprise motherfucker' }));
    assert.deepStrictEqual(JSON.parse(res.content.toString()), {
      code: 200,
      success: true,
      message: 'ok',
      data: { message: 'surprise motherfucker' },
    });

    await service.purgeAndClose();
    // await service.close();
  });

  // eslint-disable-next-line no-undef
  it('should simple consume', async () => {
    const s = await amq.ServiceCreator('localhost', 'hebele');

    await s.simpleConsume('wow', '', async (msg) => msg);

    let res = await s.rpcRequest('wow', JSON.stringify({ value: 123 }));
    res = JSON.parse(res.content.toString());
    // console.log('receive', res);
    assert.deepStrictEqual(res, { value: 123 });

    await s.purgeAndClose();
  });

  // eslint-disable-next-line no-undef
  it('should rpc request with response info', async () => {
    const s = await amq.ServiceCreator('localhost', 'hebele');

    await s.simpleConsume('wow', '', async (msg) => msg);

    await s.rpcRequest('wow', JSON.stringify({ value: 123 }), 0, ({ replyTo, correlationId }) => {
      assert.deepStrictEqual(!!replyTo, true);
      assert.deepStrictEqual(!!correlationId, true);
    });
    await s.purgeAndClose();
  });

  // eslint-disable-next-line no-undef
  it('should rpc request with header', async () => {
    const s = await amq.ServiceCreator('localhost', 'hebele');

    await s.simpleConsume('wow', '', async (msg, ch, prop) => {
      // console.log(prop);
      assert.deepStrictEqual(!!prop.correlationId, true);
      assert.deepStrictEqual(!!prop.replyTo, true);

      return msg;
    });

    await s.rpcRequest('wow', JSON.stringify({ value: 123 }), 0, ({ replyTo, correlationId }) => {
      // assert.deepStrictEqual(!!replyTo, true);
      // assert.deepStrictEqual(!!correlationId, true);
    });
    await s.purgeAndClose();
  });
});
