var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var redis = require('redis');
app.use(express.static("public"));
app.set("view engine", "ejs");
var redisClient = redis.createClient();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { MongoClient } = require('mongodb');
var bigml = require('bigml');
var source = new bigml.Source();



const getDataRedis = function(){
    //Store and get Hash i.e. object( as keyvalue pairs)
      redisClient.LRANGE("packages",0,-1,function(err, data) {
      if(data.length>0){
      console.log("reply:")
      console.log(data)
      let itemsarr =[];
      data.forEach((itemsPack)=>{
        var items=JSON.parse(itemsPack);
        console.log(items)
        itemsarr.push({items});
      })
      const uri = "mongodb+srv://<userName>:<password>@cluster0.4e5rp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


      client.connect((err) => {
        const db = client.db("arieldb");
        const collection = db.collection("items");
      // perform actions on the collection object
      // the following code examples can be pasted here...
        collection.insertMany(itemsarr, function(err, res) {
        if (err) throw err;
        console.log("Number of documents inserted: " + res.insertedCount);
        let size = data.length;
      
      redisClient.LTRIM("packages",size,-1);

      getDataMongo(db,collection);
      // catch 404 and forward to error handler
      app.use(function (req, res, next) {
      var err = new Error("Not Found");
      err.status = 404;
      next(err);
      });
        
       
      });
      
      
    });
  client.close();
  }
  });
}






 function getDataMongo(db,collection) {
  // Use connect method to connect to the server
  
  // the following code examples can be pasted here...
    collection.find({}, { projection: { _id: 0} }).toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      console.log("send to createor");
      createCSVfile(result);
    });
    

    //console.log('documents =>', findResult);
  return 'done.';
}




function createCSVfile(packages){
  const csvWriter = createCsvWriter({
    path: './CSVfiles/packages.csv',
    header: [
        {id: 'items', title: 'items'},
    ]
});

let records = [];

for(let i=0;i<packages.length;i++){
  let record = packages[i].items[0];
  for(let j=1; j<packages[i].items.length;j++){
    record+=";"+packages[i].items[j];
  }
  records.push({items: record});
}

 
csvWriter.writeRecords(records)       // returns a promise
    .then(() => {
      console.log("csv is ready")
    });
 
}



let test = [{leftSide: '-', rightSide:'-',support: '-',confidence: '-', lift:'-'}];
function bigML(){
  return new Promise(async (resolve,reject) => {
  source.create('./CSVfiles/packages.csv', function(error, sourceInfo) {
    if (!error && sourceInfo) {
      var dataset = new bigml.Dataset();
      dataset.create(sourceInfo, function(error, datasetInfo) {
        if (!error && datasetInfo) {
          var association = new bigml.Association();
          association.create(datasetInfo, async (error, modelInfo)=> {
            if (!error && modelInfo) {
              console.log(modelInfo)
                var rules = await getRules(modelInfo.resource)
                resolve(rules)
            }
            else{
              console.log("problem")
            }
          });
        }
        else{
          console.error(error)
        }
      });
    }
    else{
      console.error(error)
    }
  });
});
}


function getRules(associationId){
  return new Promise(async (resolve,reject) => {
  let rules = [];
  var connection = new bigml.BigML('oriya2011', '5d493bfc7f0074769217b774e40e22d6cc15179c');
  var association = new bigml.Association(connection)
  association.get(associationId, true,
                  'only_model=true;limit=-1',
                  async (error, resource) =>{
          if (!error && resource) {
          try{
          var localAssociation = new bigml.LocalAssociation(resource);
          }catch{return [{leftSide: '-', rightSide:'-',support: '-',confidence: '-', lift:'-'}]}
          //console.log(localAssociation.items);
          
          let itemsMap ={};
          
          console.log(localAssociation.items)
          localAssociation.items.forEach((item)=>{
              itemsMap[item.index]=item.name;
          })
          console.log("asos")
          
          
          localAssociation.getRules().forEach((rule)=>{
              let lhs = rule.lhs;
              let leftSide="";
              lhs.forEach((index)=>{
                  leftSide+=itemsMap[index]+" "
              })
              
              let rhs = rule.rhs;
              let rightSide="";
              rhs.forEach((index)=>{
                  rightSide+=itemsMap[index]+" "
              })
  
              let conf = rule.confidence;
              let support = rule.support;
              let lift = rule.lift;
              rules.push({leftSide: leftSide, rightSide: rightSide,support: support,confidence: conf, lift:lift})
          })

          resolve(rules)

          console.log("done with rules")
          console.log(rules);
          
          }
      })            
    })                     
  
  }
  



function buildAssociationRules(){
  redisClient.on('connect', function() {
    console.log('Reciver connected to Redis');
});
  return new Promise(async (resolve,reject) => {
    await getDataRedis();
    var bigmlrules= await bigML();
    resolve(bigmlrules);
  })
}


module.exports = {bigML,buildAssociationRules};
