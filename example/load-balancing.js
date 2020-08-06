/* eslint-disable no-console */
const { range } = require('lodash');
const { ServiceCreator } = require('../index.js');

const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
}, ms);

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('request.work', 'work-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());
    const res = service.responseBuilder(200, true, 'completed by worker1', { value });

    await wait(250);
    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  await service.consume('request.work', 'work-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());
    const res = service.responseBuilder(200, true, 'completed by worker2', { value });

    await wait(750);
    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  range(10).forEach((i) => {
    service.rpcRequest('request.work', JSON.stringify({ value: 7 * i })).then((res) => {
      console.log(res.content.toString());
    });
  });

  // await service.purgeAndClose();
})();
