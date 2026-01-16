const dgram = require("dgram");
const dns = require("dns");

let resolver;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--resolver") {
    resolver = process.argv[i + 1];
    i++;
  }
}
dns.setServers([resolver]);

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// TODO: Uncomment the code below to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", async (buf, rinfo) => {
  try {
    const header = parseHeader(buf);
    let questions = [];
    let answers = [];

    let offset = 12; // DNS header is 12 bytes, skip header to start with question initially
    const qdcount = buf.readUInt16BE(4);
    for (let i = 0; i < qdcount; i++) {
      const { question, answer } = await buildQuestionAnswer(buf, offset);
      questions.push(...question);
      answers.push(...answer);
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
  const qdcount = buf.readUInt16BE(4);
  return [
    buf.readUInt8(0),
    buf.readUInt8(1),
    parseInt(arr.join(""), 2),
    parseInt(rcode.padStart(8, "0"), 2),
    qdcount >> 8, // first 8bits
    qdcount & 0xff, // last 8bits
    qdcount >> 8, // first 8bits
    qdcount & 0xff, // last 8bits
    0x00,
    0x00,
    0x00,
    0x00,
  ];
}

function extractDomainName(buf, offset) {
  // label: <length + char> + null bytes

  let res = [];
  const tmp = buf.subarray(offset);
  let pos = 0; // position of the "length of label"
  while (true) {
    if (isCompressed(tmp.subarray(pos))) {
      // starts with 11, label is compressed
      const pointer = tmp.readUInt16BE(pos) & 0x3fff; // AND with 0011 1111 1111 1111 to get the pointer
      const compressed = extractDomainName(buf, pointer); // no uncompressed parts after compressed part
      res.push(...compressed);
      break;
    } else {
      const len = tmp.readUInt8(pos);
      if (len === 0) {
        res.push(0x00);
        break;
      }
      const sl = tmp.slice(pos, pos + len + 1);
      res.push(...sl);
      pos += len + 1; // move to next label
    }
  }

  return res;
}

function uint8ToBinaryString(byte) {
  return byte.toString(2).padStart(8, "0");
}

async function buildQuestionAnswer(buf, offset) {
  const domainName = extractDomainName(buf, offset);

  const question = [
    ...domainName,
    0x00,
    0x01, // Type A
    0x00,
    0x01, // Class IN
  ];

  const addresses = await new Promise((resolve, reject) => {
    dns.resolve(labelToString(domainName), "A", (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
  console.log(addresses);
  const addr = addresses[0].split(".");
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
    parseInt(addr[0]),
    parseInt(addr[1]),
    parseInt(addr[2]),
    parseInt(addr[3]),
  ];
  return {
    question: question,
    answer: answer,
  };
}

function isCompressed(buf) {
  const byte = buf.readUInt8(0);
  return byte >> 6 === 3;
}

function labelToString(buf) {
  let pos = 0;
  let labels = [];

  while (true) {
    const len = buf[pos];
    if (len === 0) break; // end of name
    const label = String.fromCharCode(...buf.slice(pos + 1, pos + 1 + len));
    labels.push(label);
    pos += len + 1; // move to next label
  }

  return labels.join(".");
}
