const dgram = require("dgram");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    const header = parseHeader(buf);
    console.log(header);

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
      0x02, // 2 length
      0x69, // i
      0x6f, // o
      0x00, // null terminator of FQDN
      0x00,
      0x01, // Type A
      0x00,
      0x01, // Class IN
    ];

    const answer = [
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
      0x02, // 2 length
      0x69, // i
      0x6f, // o
      0x00, // null terminator of FQDN
      0x00,
      0x01, // Type A
      0x00,
      0x01, // Class IN
      0x00,
      0x00,
      0x00,
      0x3c, // TTL 60 seconds
      0x00,
      0x04, // Data length 4 bytes
      0x7f, // 127
      0x00, // 0
      0x0, // 0
      0x01, // 1
    ];

    udpSocket.send(
      Buffer.from([...header, ...question, ...answer]),
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

function parseHeader(buf) {
  const id = buf.readUInt16BE(0);
  const tmp = uint8ToBinaryString(buf.readUInt8(2));
  let arr = [...tmp];
  arr[0] = "1";
  arr[5] = "0";
  arr[6] = "0";
  const opcode = parseInt(arr.slice(1, 5).join(""), 2);
  let rcode = "0000";
  if (opcode !== 0) {
    rcode = "0100"; // Not Implemented
  }
  return [
    id,
    bitStringToHexByte(arr.join("")),
    bitStringToHexByte(rcode.padStart(4, "0")),
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
  ];
}

function uint8ToBinaryString(byte) {
  return byte.toString(2).padStart(8, "0");
}

function bitStringToHexByte(bitString) {
  // 1. Parse binary string to a number (radix 2)
  const decimalValue = parseInt(bitString, 2); // e.g., "10110010" -> 178

  // 2. Convert number to hex string (radix 16) and pad to 2 digits
  const hexByte = decimalValue.toString(16).padStart(2, "0"); // 178 -> "b2"

  // 3. Add the 0x prefix
  return "0x" + hexByte; // "0xb2"
}
