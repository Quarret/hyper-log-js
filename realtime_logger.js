// @ts-check
// 类似 cpp 的头文件
const fs = require(`fs`);
const EvnetEmitter = require(`events`);
const path = require(`path`);
const os = require(`os`)


// 定义监控器
class LogMonitor extends EvnetEmitter {
    // 通过构造器初始化文件名和文件大小
    constructor(filename) {
        super();
        this.filename = filename;
        this.filesize = fs.statSync(filename).size;
    }

    // 开启函数
    start() {
        // 输出开始标识
        // $ 占位符后可以直接找对应参数
        // log 中用的是 ``
        console.log(`[System]: 开始监控: ${this.filename}`);
    
        // fs.watch 监控文件变化, 通过文件状态监控, lambda 表达式
        fs.watch(this.filename, {persistent: true}, (eventType) => {
            if (eventType == `change`) {
                this.readNewLine();
            }
        });
    }

    // 读取文件新内容
    readNewLine() {
        // 文件状态和文件当前大小
        const stats = fs.statSync(this.filename)
        const currentSize = stats.size

        // 如果 cur 小, 则文件被删除部分内容
        if (currentSize < this.filesize) {
            this.filesize = currentSize;
            return;
        }

        // 初始化读取流, 从 filesize 读到 currentSize
        const readStream = fs.createReadStream(this.filename, {
            start: this.filesize,
            end: currentSize
        });

        // 开启读取流, 读入到 chunk
        // on 监听事件, emit 将 args 作为参数传入所有通过 xxx.on('new_log') 注册的函数
        readStream.on(`data`, (chunk) => {
            this.filesize = currentSize;
            this.emit('new_log', chunk.toString().trim());
        });

        // 读取时的错误处理: 错误上传
        readStream.on(`error`, (err) => {
            this.emit(`error`, err);
        });
    }
}

// 主逻辑
// log 文件地址
const LOG_FILE = path.join(__dirname, `access.log`);

// 如果不存在 log, 创建 log, 避免后续报错
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `--- start Log ---\n`);
}

// 示例化 logMonitor
const monitor = new LogMonitor(LOG_FILE);

// 通过 on 订阅事件
monitor.on('new_log', (data) => {
    // 时间戳
    const timeStamp = new Date().toLocaleDateString();
    // \x1b 告诉控制台接下来是命令 [32m 是绿色 [0m 重置字体颜色和背景色
    console.log(`\x1b[32m[LOG ${timeStamp}]\x1b[0m ${data}`);

    // 报错
    if (data.includes(`ERROR`)) {
        console.log(`\x1b[31m[ALERT]\x1b[0m 检测到异常行为!`);
    }
});

// 监控器报错
monitor.on(`error`, (err) => {
    console.log(`监控出错:`, err);
});

// 生产者, 向 log 中写数据
setInterval(() => {
    // 定义状态码和模式
    const stateCode = [200, 201, 404, 500];
    const methods = [`GET`, `POST`, `DELETE`];
    const randState = stateCode[Math.floor(Math.random() * stateCode.length)];
    const randMethod = methods[Math.floor(Math.random() * methods.length)];

    // 随机日志
    const logEntry = `${randMethod} /api/v1/resource - ${randState} ${randState == 500 ? `ERROR` : `OK`}\n`;

    // 异步写入 log
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) throw err;
    });
}, 2000);


// 系统信息
console.log(`--- 环境信息 ---`);
console.log(`操作系统: ${os.type}`);
console.log(`架构: ${os.arch}`);
console.log(`可用内存: ${(os.freemem() / 1024/ 1024).toFixed(2)} MB`)
console.log(`------------`);

// 开启监控器
monitor.start();