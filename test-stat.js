const fs = require('fs/promises');
const path = "//192.168.19.189/encova";
console.log("Checking path:", path);
fs.statfs(path).then(s => {
    console.log({ size: s.bsize * s.blocks, free: s.bsize * s.bfree });
}).catch(console.error);
