## amqp-rpc-node-client

rabbitmq with management ui

```bash
docker run -d --rm --name rabbitmq -p 8080:15672 -p 5672:5672 rabbitmq:3-management
```

rabbitmq standalone

```bash
docker run -d --rm --name rabbitmq -p 5672:5672 rabbitmq:3
```

note : service won't work without rabbitmq

### usage 


`yarn add amqp-rpc-node-client`

simple rpc usage example

```js
const { ServiceCreator } = require('amqp-rpc-node-client');

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

  // with reply-to and correlation-id
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
```

simple consumer example

```js
const assert = require('assert');
const { ServiceCreator } = require('amqp-rpc-node-client');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.simpleConsume('simple.math.square', 'simple-math-square', async (msg) => {
    const { value } = JSON.parse(msg);
    return JSON.stringify({ result: value * value });
  });

  let res = await service.rpcRequest('simple.math.square', JSON.stringify({ value: 2 }));
  res = JSON.parse(res.content.toString());
  console.log(res);
  assert.deepStrictEqual(res, { result: 4 });

  await service.close();
})();
```

go example directory for further examples
