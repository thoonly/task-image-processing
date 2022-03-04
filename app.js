require("dotenv").config();
const express = require("express");
const Broker = require("./src/services/rabbitMQ");
const fileUpload = require("express-fileupload");
const publishToExchange = require("./src/queueWorkers/producer");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const {promisify} = require("util")
const createError = require('http-errors');
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const indexRouter = require("./routes/index");

const RMQProducer = new Broker().init();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use(fileUpload());


app.use(async (req, res, next) => {
  try {
    req.RMQProducer = await RMQProducer;
    next();
  } catch (error) {
    process.exit(1);
  }
});

const saveImage= (data) => {
  const writeFile = promisify(fs.writeFile)
  return new Promise((resolve, reject) => {
    if (!data) {
      reject("File not available!");
    }
    try {
      const fileName = `img_${uuid()}.jpg`;

      writeFile(`./src/uploads/original/${fileName}`, data).then(()=>{
        resolve(fileName);
      });
    } catch (error) {
      reject(error)
    }
  });
};

// your routes here
app.post("/upload", async (req, res) => {
  const { data } = req.files.image;
  try {
    const message = await saveImage(data)
    await publishToExchange(req.RMQProducer, {
      message,
      routingKey: "image",
    });
    res.status(200).send("File uploaded successfully!")
  } catch (error) {
    res.status(400).send(`File not uploaded!`)
  }
});

app.use((req, res, next) => {
  next(createError.NotFound());
});

// error handling
app.use((err, req, res, next) => {
  if(err){
    res.status(err.status || 500).send({
      error: {
        status: err.status || 500,
        message: err.message,
      },
    });
  }else{
    next()
  }
});
// app.listen(process.env.PORT || 3000, () => {
//   console.log("server is running", process.env.PORT || 3000);
// });

process.on("SIGINT", async () => {
  process.exit(1);
});
process.on("exit", (code) => {
  RMQProducer.channel.close();
  RMQProducer.connection.close();
});

module.exports = app;
