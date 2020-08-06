const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  // if queue name given empty string, queue name will be random name
  await service.consume('request.add-ten', '', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());
    const res = service.responseBuilder(200, true, '', { value: value + 10 });

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  // if queue name given empty string, queue name will be random name
  await service.consume('request.multiply-two', '', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    const { value } = JSON.parse(msg.content.toString());

    let res = await service.rpcRequest('request.add-ten', JSON.stringify({ value }));
    const responseOfAddTen = JSON.parse(res.content.toString()).data.value;
    res = service.responseBuilder(200, true, '', { value: responseOfAddTen * 2 });

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  const res = await service.rpcRequest('request.multiply-two', JSON.stringify({ value: 7 }));
  console.log(res.content.toString());

  await service.purgeAndClose();
})();
