const express = require("express");
const router = express.Router();
var multer = require("multer");
var MongoClient = require("mongodb").MongoClient;
var CircularJSON = require("circular-json");
var ObjectId = require("mongodb").ObjectId;
var crypto = require("crypto");
var fs = require("fs-extra");
var cron = require('node-cron');
var URL = process.env.MONGO_URL;

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./tmp/");
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

var upload = multer({
  storage: storage,
  onError: function(err, next) {
    console.log("error", err);
    next(err);
  }
}).single("file");

router.get("/:userId", (req, res, next) => {
  var token = req.headers["authorization"];
  if (!req.params.userId) {
    res.status(404).send({ auth: false, message: "No UserID provided." });
  }
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("users");
    var users = collection
      .find({ _id: ObjectId(req.params.userId) })
      .toArray()
      .then(result => {
        if (result.length == 1)
          res.json(result[0]);
        else
          res.status(404).json({ message: 'User Not Found', status: 0 });
      });
  });
});

router.get("/", (req, res, next) => {
  // var token = req.headers["authorization"];
  // if (token == null) {
  //   res.status(500).send({ auth: false, message: "No token provided." });
  // }
  // token = token.split(" ");
  // if (!token[1]) {
  //   return res.status(401).send({ auth: false, message: "No token provided." });
  // }
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("users");
    var users = collection
      .find({})
      .toArray()
      .then(result => {
        res.json(result);
      });
  });
})

router.post("/", (req, res, next) => {
  // var token = req.headers["authorization"];
  // token = token.split(" ");
  // if (!token[1])
  //   return res.status(401).send({ auth: false, message: "No token provided." });
  const { sellerId, marketPlaceId, secretKey, awsAccessKeyId, email } = req.body;
  var amazonMws = require('amazon-mws')(awsAccessKeyId, secretKey);  
  amazonMws.orders.search({
      'Version': '2013-09-01',
      'Action': 'ListOrders',
      'SellerId': sellerId,
      'MarketplaceId.Id.1': marketPlaceId,
      'LastUpdatedAfter': new Date(2018, 10, 1, )
  }, function (error, response) {
      if (error) {
          res.status(404).json({
            success : 0
          });
          return;
      }
      MongoClient.connect(URL, function(err, db) {
        if (err) throw err;
        var collection = db.collection("users");
        collection.find({ email : email })
        .toArray()
        .then(result => {      
          if (result.length == 0) {
            collection
              .insert({ 
                email : email,
                seller_id : sellerId, 
                market_place_id : marketPlaceId,
                secret_key : secretKey,
                aws_access_key_id : awsAccessKeyId,
                last_date : new Date()
              })
              .then(c_result => {
                res.json({
                  data : c_result['ops'][0],
                  success : 1
                });
              });
          }
          else
            res.status(200).json({
              data : result[0],
              success : 1
            });
        });
      });
  });
});

router.put("/:id", (req, res, next) => {
  var token = req.headers["authorization"];
  token = token.split(" ");
  if (!token[1])
    return res.status(401).send({ auth: false, message: "No token provided." });
  const id = req.params.id;
  const param = req.body;
  delete param._id;
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("users");
    collection
      .update(
        { _id: ObjectId(id) },
        { ...param }
      )
      .then(result => {
        res.json(result);
      });
  });
});

router.delete("/:id", (req, res, next) => {
  var token = req.headers["authorization"];
  token = token.split(" ");
  if (!token[1])
    return res.status(401).send({ auth: false, message: "No token provided." });
  const id = req.params.id;
  const { username, password, email } = req.body;
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("users");
    collection.remove({ _id: ObjectId(id) }).then(result => {
      res.json(result);
    });
  });
});

module.exports = router;
