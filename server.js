const express = require("express");
const app = express();
const appRedis =express();
const server = require('http').createServer(app);
const io = require("socket.io")(server)
app.use(express.static("public"));
app.set("view engine", "ejs");
var serverRedis = require('http').Server(appRedis);
var redis = require('redis');
var redisClient = redis.createClient();
const fs = require('fs');


/* read messages from redis */
const getMessageRedis = function(){
  redisClient.subscribe('message'); 
  
  // catch 404 and forward to error handler
  appRedis.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
  });
  
  // no stacktraces leaked to user
  appRedis.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: {}
      });
  });
  
  // get the object message from redis and update the dashboard
  redisClient.on("message", function (channel, messagePackage) {
      let dataPackage = JSON.parse(messagePackage);
      

      //update the array of dashboardData
      updateDashboardData(dataPackage);
      // socket io helps to connect with server
      io.emit("data_update",{
        //send the updated array
        districts: dashboardData
      });
      console.log(dataPackage);
  });
}
// update array dashboardData
function updateDashboardData(dataPackage) {
  districtObj = dashboardData.find( ({ district }) => district === dataPackage.district );
  districtObj.amount++;
  districtObj[`${dataPackage.size}`][`${dataPackage.taxes}`]++;
}
// listening to messages from redis
getMessageRedis();


let dashboardData = [
  {district: "North",amount: 0, small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0} },
  {district: "Haifa", amount: 0, small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0}},
  {district: "Centeral",amount: 0, small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0}},
  {district: "Jerusalem",amount: 0, small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0} },
  {district: "South", amount: 0, small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0} },
  {district: "Shomron", amount: 0,small:{free:0,extra:0,maximum:0}, medium:{free:0,extra:0,maximum:0}, large:{free:0,extra:0,maximum:0} },
];

/*send data for dashboard */
app.get("/", (req, res) => {
  var data = {
    districts: dashboardData,
  };
  res.render("pages/dashboard", data);
});

// חיבור והאזנה לרדיס
redisClient.on('connect', function() {
    console.log('Reciver connected to Redis');
});

serverRedis.listen(6061, function() {
    console.log('reciver is running on port 6061');
});


server
  .listen(3000, () => console.log(`Listening Socket on http://localhost:3000`));



//connection to FIREBASE
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename:
  //json file - firebase project (removed) 
    "<file.json>",
});

let bucketName = "<gs://projectName.appspot.com>";



const getArrivedPackagesFromFB = async() => {
  // waits to get all data from firebase
  const [files] = await storage.bucket(bucketName).getFiles();
  files.forEach(async (file)=>  {
    const filename=file.name; 
    const filepath = `./QRcodes/afterFB/${filename}`;
    // Downloads the file
    const options = {
      // The path to which the file should be downloaded, e.g. "./file.txt"
      destination: filepath,
    };
    
    await file.download(options); //download the qrcode to pc
    console.log(
      `gs://${bucketName}/${filename} downloaded to .`
    );
    
    let filenameparts = filename.split(".");
    if(filenameparts[1] == 'png'){
      //qrReader(filenameparts[0]);
    }
    else{
      let dataPackage = readText(filepath);
      const districtObj = dashboardData.find( ({ district }) => district === dataPackage.district );
            districtObj.amount--;
            districtObj[`${dataPackage.size}`][`${dataPackage.taxes}`]--;
            io.emit("data_update",{
              districts: dashboardData
            });
      
    }

    await file.delete(); //delte the qrcode from firebase in order to avoid duplicate delteing

    removeFile(filepath); //delete from my pc
    
}  );
}
  
/*every 30 seconds check for arrived packages in FB */
setInterval(getArrivedPackagesFromFB,30000);


//delete from my pc
const removeFile = function(filePath) {
  console.log(`remove file ${filePath}`)
  fs.rm(filePath, (err) => {
    if (err) {
        console.log("failed to delete local file:"+err);
    } else {
        console.log('successfully deleted local file');                                
    }
  });
} 

const readText = function(filePath){
    try {  
      var stringdata = fs.readFileSync(filePath, 'utf8');
      const dataPackage = JSON.parse(stringdata);
      return dataPackage;
    } catch(e) {}
}









app.listen(process.env.PORT || 8088, () => { console.log('node server running');}) //not necessery
