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
    await wait(250);
    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify({ value, completedBy: 'worker1' }), { correlationId });
    }
  });

  await service.consume('request.work', 'work-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());
    await wait(750);

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify({ value, completedBy: 'worker2' }), { correlationId });
    }
  });

  range(10).forEach((i) => {
    service.rpcRequest('request.work', JSON.stringify({ value: 7 * i })).then((res) => {
      console.log(res.content.toString());
    });
  });

  // await service.purgeAndClose();
})();
