const dgram = require("dgram");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    const header = [
      0x04, 0xd2, 0x80, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];

    const question = [
      0x0c, // 12 bytes length
      0x63, // c
      0x6f, // o
      0x64, // d
      0x65, // e
      0x63, // c
      0x72, // r
      0x61, // a
      0x66, // f
      0x74, // t
      0x65, // e
      0x72, // r
      0x73, // s
      0x03, // 3 length
      0x63, // c
      0x6f, // o
      0x6d, // m
      0x00, // null terminator of FQDN
      0x00,
      0x01, // Type A
      0x00,
      0x01, // Class IN
    ];

    udpSocket.send(
      Buffer.from(header.concat(question)),
      rinfo.port,
      rinfo.address
    );
  } catch (e) {
    console.log(`Error receiving data: ${e}`);
  }
});

udpSocket.on("error", (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});
