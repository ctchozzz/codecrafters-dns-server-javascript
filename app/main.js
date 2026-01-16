const dgram = require("dgram");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    const header = parseHeader(buf);
    let questions = [];
    let answers = [];
    console.log(buf);

    let offset = 12; // DNS header is 12 bytes, skip header to start with question initially
    const qdcount = buf.readUInt16BE(4);
    for (let i = 0; i < qdcount; i++) {
      const { question, answer } = buildQuestionAnswer(buf, offset);
      questions = questions.concat(question);
      answers = answers.concat(answer);
      offset += question.length; // move to next question
    }

    udpSocket.send(
      Buffer.from([...header, ...questions, ...answers]),
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
    buf.readUInt8(0),
    buf.readUInt8(1),
    parseInt(arr.join(""), 2),
    parseInt(rcode.padStart(8, "0"), 2),
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

function extractDomainName(buf) {
  // label: <length + char> + null bytes

  let res = [];
  let pos = 0; // position of the "length of label"
  while (true) {
    const len = buf.readUInt8(pos);
    if (len === 0) {
      res.concat([0x00]);
      break;
    }
    res = res.concat(buf.slice(pos, pos + len + 1));
    pos += len + 1; // move to next label
  }
  return res;

  // if (isCompressed(buf.subarray(pos))) {
  //   // starts with 11, label is compressed
  //   const pointer = buf.readUInt16BE(pos) & 0x3fff; // AND with 0011 1111 1111 1111 to get the pointer
  //   console.log("pointer:", pointer);
  //   const pointedName = extractDomainName(buf.subarray(pointer));
  //   console.log("pointedName:", pointedName);
  //   res.concat(Buffer.concat([buf.slice(0, pos), pointedName]));

  //   // for compressed message, label takes up 2 bytes (11 + 14 bit pointer)
  //   pos += 2;
  // } else {
  //   const len = buf.readUInt8(pos);
  //   if (len === 0) {
  //     break;
  //   }
  //   res = res.concat(buf.slice(pos, pos + len + 1));
  //   pos += len + 1;
  // }
}

//   return res;
// }

function uint8ToBinaryString(byte) {
  return byte.toString(2).padStart(8, "0");
}

function buildQuestionAnswer(buf, offset) {
  console.log("buildQuestionAnswer offset:", offset);
  const domainName = extractDomainName(buf.subarray(offset));

  const question = [
    ...domainName,
    0x00,
    0x01, // Type A
    0x00,
    0x01, // Class IN
  ];

  const answer = [
    ...domainName,
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
  return {
    question: question,
    answer: answer,
  };
}

function isCompressed(buf) {
  const byte = buf.readUInt8(0);
  const binaryStr = uint8ToBinaryString(byte);
  console.log("isCompressed byte:", byte);
  console.log("isCompressed binaryStr:", binaryStr);
  return binaryStr.startsWith("11");
}
