require("dotenv").config();
const createError = require('http-errors');
const express = require("express");
const Broker = require("./src/services/rabbitMQ");

const app = express();
const RMQProducer = new Broker().init();
app.use(async (req, res, next) => {
    try {
        const RMQProducer = await RMQProducer;
        // we now have access to rabbitMQ
        next();
    } catch (error) {
        process.exit(1);
    }
});
app.use((req, res, next) => {
    next(creatError.NotFound());
});

app.listen(process.env.PORT || 3000, async () => {

    console.log("server is running", process.env.PORT || 3000);
});
