const express = require("express");
const app = express();
const server = require('http').createServer(app);
app.use(express.static("public"));
app.set("view engine", "ejs");
const {buildAssociationRules} = require("./readRedis");


app.get("/bigml",async (req, res) => {
    var data={
      rules:[{leftSide: '-', rightSide:'-',support: '-',confidence: '-', lift:'-'}]
    }
    res.render("pages/analystics",data);
  });
  
  app.get("/bigml/itemsets", async (req, res) => {
    /*load_button=false;
    var result = await generateItemSets();
    parsed = JSON.stringify(result,null,2)
    console.log(parsed)
  */
  var result = await buildAssociationRules();
    var data = { 
      rules: result,
    };
    console.log("result");
    console.log(result);
    res.render("pages/analystics",data);
  });

  server
  .listen(3001, () => console.log(`Listening Socket on http://localhost:3001/bigml`));