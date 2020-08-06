const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('request.echo', 'worker-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;
    const res = service.responseBuilder(200, true, 'ok', JSON.parse(msg.content.toString()));

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  setInterval(async () => {
    const res = await service.rpcRequest('request.echo', JSON.stringify({ value: `surprise ${Date()}` }));
    console.log(JSON.parse(res.content.toString()));
  }, 1000);

  // await service.purgeAndClose();
})();
