var app = require("express")();
var server = require("http").Server(app);
var redis = require("redis");
var redisClient = redis.createClient();
const fs = require('fs');
//import QRcode
//const QRCode = require("qrcode");

/*connection to FIREBASE */
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename:
  //json file - firebase project (removed) 
    "<file.json>",
});

let bucketName = "<gs://projectName.appspot.com>";


const districts = [
  "North",
  "Haifa",
  "Centeral",
  "Jerusalem",
  "South",
  "Shomron",
];

// Data for packages
const Items = [
  "phone",
  "headphons",
  "laptop",
  "streamer",
  "tablet",
  "phone charger",
  "laptop-backpack",
  "laptop bag",
  "phone-case",
  "tablet-case",
  "airpods",
  "airpods-case",
  "mouse",
  "television",
  "watch",
];
const sizes = ["small", "medium", "large"];
const taxes = ["free", "extra", "maximum"];
const cities = [
  (North = [
    "Beit Shean",
    "Tibirias",
    "Nahariya",
    "Carmiel",
    "Natzrat",
    "Akko",
    "Tzfat",
    "Kiryat Shmona",
    "Shlomi",
    "Katzrin",
    "Rosh Pinna",
    "Kefar Tavor",
    "Afula",
  ]),
  (Haifa = [
    "Haifa",
    "Hadera",
    "Kiryat Ata",
    "Nesher",
    "Tirat Carmel",
    "Or Akiva",
    "Binyamina",
    "Zichron Yaakov",
    "Harish",
    "Iron",
    "Pardes Hanna",
    "Reachasim",
  ]),
  (Centeral = [
    "Or Yehuda",
    "Bene Baraq",
    "Bat Yam",
    "Givataym",
    "Hezeliya",
    "Holon",
    "Kiryat Ono",
    "Ramat Gan",
    "Ramat Hasharon",
    "Tel Aviv",
    "Azur",
    "Kefar Shmaryahu",
    "Elad",
    "Beer Yaakov",
    "Givat Shmuel",
    "Hod Hasharon",
    "Yahud",
    "Yavne",
    "Kefar Yonna",
    "Kefar Sava",
    "Lod",
    "Modiin",
    "Nes Tzyona",
    "Netanya",
    "Petach Tikva",
    "Rosh Haayin",
    "Raanana",
    "Rmale",
    "Rehovot",
  ]),
  (Jerusalem = [
    "Beit Shemesh",
    "Jerusalem",
    "Mevaseret Tzion",
    "Kiryat Yearim",
    "Abu Gush",
    "",
  ]),
  (South = [
    "Ofakim",
    "Eilat",
    "Ashdod",
    "Beer Sheva",
    "Ashkelon",
    "Dimonna",
    "Netivot",
    "Arad",
    "Kiryat Gat",
    "Kiryat Malachi",
    "Sedrot",
    "Yeruham",
    "Mitspe Ramon",
    "Omer",
    "Meytar",
    "Neta",
  ]),
  (Shomron = [
    "Ariel",
    "Beytar Ilit",
    "Oranit",
    "Maale Adumim",
    "Alfei Menashe",
    "Elkana",
    "Efrat",
    "Beit El",
    "Emanuel",
    "Karnei Shmoron",
    "Kdumim",
    "Kiryat Arba",
    "Givat Zeev",
  ]),
];
const addresses = [
  "dekel 20",
  "hagana 15",
  "ben gurion 30",
  "berl 18",
  "narkis 19",
  "lilach 9",
  "shimshon hagibor 66",
  "altreman 17",
  "nili 1",
  "chana senesh 28",
  "ir david 2",
  "yefe nof 9",
  "neve shaanan 3",
  "savyonim 10",
  "rimon 5",
  "gefen 6",
  "bar lev 54",
  "habanim 132",
  "hanadiv 68",
  "yoel salomon 74",
  "ehud manor 56",
  "hadarim 45",
  "botnim 88",
  "macabim 43",
  "hashmonaim 55",
];

// Random function (return index) to round number
function randInt(range) {
  return Math.floor(Math.random() * range);
}

// counter for tracking packageID
let trackCounter = 0;
// array of objects of packages
let dataPackages = [];

// generate random packages
function generatePackages() {
  const MAX_PACKS_NUM = 50;
  const MAX_ITMS_NUM =4;
  
  // get number of packages that will be generated - max range and +1 to get range from 1
  let packs_num = randInt(MAX_PACKS_NUM) + 1;

  // loop the packets numbers
  for (let pack = 0; pack < packs_num; pack++) {
    let districtNum = randInt(cities.length);
    let districtCitiesSize = cities[districtNum].length; //number of cities in this district
    let city = cities[districtNum][randInt(districtCitiesSize)]; // choose the district and then the city
    // items for bigml associtions to be at least 2
    let itms = [];
    let itms_num = randInt(MAX_ITMS_NUM) + 2;
    let coin = randInt(2);
    if(coin){
      itms.push(Items[0]);
      itms.push(Items[1]);
    }
    for (let itm = 0; itm < itms_num; itm++) {
      itms.push(Items[randInt(Items.length)]);
    }
    
    // define package object
    let packageRedis = {
      trackingId: trackCounter++,
      size: sizes[randInt(sizes.length)],
      taxes: taxes[randInt(taxes.length)],
      district: districts[districtNum],
      items: itms,
      address: `${addresses[randInt(addresses.length)]}, ${city}`,
    };
    // insert to data packages array the object
    dataPackages.push(packageRedis);
    sendMessageRedis(packageRedis); // send the package to redis and message
  }
}


/*send message and insert the JSON package data to redis*/
const sendMessageRedis = function(package){  
    jsonPackage = JSON.stringify(package.items);
    console.log("jsonpack: "+ jsonPackage)

    redisClient.RPUSH("packages",jsonPackage);

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      var err = new Error("Not Found");
      err.status = 404;
      next(err);
    });

    messagePackage= {
    district: package.district,
    size: package.size,
    taxes: package.taxes
  }

  jsonMessagePackage= JSON.stringify(messagePackage);

  redisClient.publish(
    "message",
    jsonMessagePackage,
    function () {
    }
  );

  console.log("mess:" +jsonMessagePackage);
}

// לתקשר עם הרדיס
redisClient.on("connect", function () {
  console.log("Sender connected to Redis");
});
server.listen(6062, function () {
  console.log("Sender is running on port 6062");
});

setInterval(generatePackages, 10000); 



/*QRcode */
const arrivedPackages = function () {
  if(dataPackages.length){
  
    let numArrivedPackages = Math.floor(Math.random() * Math.min(10,dataPackages.length)) + 1; //decide how much packages will arrive
    
    for (let i = 0; i < numArrivedPackages; i++) {
      // find random index of package in the array
      let randomIndex = Math.floor(Math.random() * dataPackages.length);
      const pack = dataPackages.splice(randomIndex, 1)[0]; //get the package at randomIndex and delete it
      console.log(`chosen pack: ${pack.trackingId}`);
      const packPath = `./QRcodes/beforeFB/package${pack.trackingId}`;
      var jsonPack = {trackingId: pack.trackingId,district:pack.district,size:pack.size,taxes:pack.taxes};
      const stringdata = JSON.stringify(jsonPack); // Converting the data into String format
      //generateQRcode(pack.trackingId,stringdata); // generate a QRcode for this package
      generateText(pack.trackingId,stringdata);
      uploadFile(packPath); // upload the QRcode and text file to fireBase -> means they are arrived
    }
  }
};
setInterval(arrivedPackages, 25000);

/*
const generateQRcode = function (trackingId,stringdata) {
  QRCode.toFile(
    `./QRcodes/beforeFB/package${trackingId}.png`,
    stringdata,
    function (err, code) {
      if (err) return console.log("error occurred");
    }
  );
  console.log(`pck num ${trackingId} generate`);
};*/

//generate text file with package details in json
const generateText= function (trackingId,stringdata) {
  fs.writeFile(`./QRcodes/beforeFB/package${trackingId}.txt`, stringdata, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file was saved!");
}); 
}

// upload file text (and qrcode) to firebase
const uploadFile = async (filename) => {
  // Uploads a local file to the bucket
  /*
  await storage.bucket(bucketName).upload(`${filename}.png`,{
    gzip: false,
    // By setting the option `destination`, you can change the name of the
    // object you are uploading to a bucket.
    metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
    },
});
*/
await storage.bucket(bucketName).upload(`${filename}.txt`,{
  gzip: false,
  // By setting the option `destination`, you can change the name of the
  // object you are uploading to a bucket.
  metadata: {
      // Enable long-lived HTTP caching headers
      // Use only if the contents of the file will never change
      // (If the contents will change, use cacheControl: 'no-cache')
      cacheControl: 'public, max-age=31536000',
  },
});
  
  // remove from pc the qrcode
  /*fs.rm(`${filename}.png`, (err) => {
    if (err) {
        console.log("failed to delete local image:"+err);
    } else {
        console.log('successfully deleted local image');                                
    }
  });*/

   // remove from pc the text
  fs.rm(`${filename}.txt`, (err) => {
    if (err) {
        console.log("failed to delete local image:"+err);
    } else {
        console.log('successfully deleted local image');                                
    }
  });
  console.log(`${filename} uploaded to ${bucketName}.`);
};