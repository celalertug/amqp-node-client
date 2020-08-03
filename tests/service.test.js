const assert = require('assert');

const amq = require('../index.js');

// eslint-disable-next-line no-undef
describe('service', () => {
  // eslint-disable-next-line no-undef
  it('should simple', async () => {
    const service = await amq.ServiceCreator('localhost', 'hebele');
    //
    await service.consume('request.echo', 'worker-queue', async (msg) => {
      const { replyTo, correlationId } = msg.properties;

      if (replyTo) {
        await service.sendToQueue(replyTo, msg.content.toString(), { correlationId });
      }
    });

    const res = await service.rpcRequest('request.echo', 'surprise motherfucker');
    assert.deepStrictEqual(res.content.toString(), 'surprise motherfucker');
    // console.log(res.content.toString());

    await service.purgeAndClose();
    // await service.close();
  });
});
