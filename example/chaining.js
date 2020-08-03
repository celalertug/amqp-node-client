const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  // if queue name given empty string, queue name will be random name
  await service.consume('request.add-ten', '', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify({ value: value + 10 }), { correlationId });
    }
  });

  // if queue name given empty string, queue name will be random name
  await service.consume('request.multiply-two', '', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());

    const res = await service.rpcRequest('request.add-ten', JSON.stringify({ value: value * 2 }));

    if (replyTo) {
      await service.sendToQueue(replyTo, res.content.toString(), { correlationId });
    }
  });

  const res = await service.rpcRequest('request.multiply-two', JSON.stringify({ value: 7 }));
  console.log(res.content.toString());

  await service.purgeAndClose();
})();
