const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('request.echo2', 'request-echo2', async (msg) => {
    const { replyTo, correlationId } = msg.properties;
    const res = service.responseBuilder(200, true, 'ok', JSON.parse(msg.content.toString()));

    if (replyTo) {
      await service.sendToQueue(replyTo, JSON.stringify(res), { correlationId });
    }
  });

  setInterval(async () => {
    await service.rpcRequest(
      'request.echo',
      JSON.stringify(
        { value: `surprise ${Date()}` },
      ), 0, ({ replyTo, correlationId }) => {
        console.log('replyTo', replyTo); // replyTo amq.gen-G9lrsEB013fEBOuLgy1hiQ
        console.log('correlationId', correlationId); // correlationId 532de226-ace3-4ead-b859-a314699d45a5
      },
    );
  }, 1000);

  // await service.purgeAndClose();
})();
