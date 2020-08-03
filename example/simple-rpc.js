const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('request.echo', 'worker-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    if (replyTo) {
      await service.sendToQueue(replyTo, msg.content.toString(), { correlationId });
    }
  });

  setInterval(async () => {
    const res = await service.rpcRequest('request.echo', `surprise ${Date()}`);
    console.log(res.content.toString());
  }, 1000);

  // await service.purgeAndClose();
})();
