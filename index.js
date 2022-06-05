const express = require('express');
var bodyParser = require('body-parser');
const querystring = require('querystring'); 
const { redirect, json } = require('express/lib/response');
const mongoose = require('mongoose');
const User = require('./model/user');
const UserData = require('./model/userdata')
var int_encoder = require("int-encoder");
var crypto = require("crypto");
const path = require("path");
const data = require("./data.json");
const axios = require('axios')
// const instance = axios.create({
//   baseURL: 'https://realtime.ifttt.com/v1',
//   timeout: 1000,
//   headers: {'Ifttt-Service-Key': 'uTTMHvMT_L4863-vOPPiL1skasZorVs6xhZqjzuxKOhGeB6bH8JazIhdFytGxpCX'}
// });

//const {LocalStorage} = require("node-localstorage");

int_encoder.alphabet();

//localStorage = new LocalStorage('./scratch');

const ENCRYPTION_KEY = "xyz123";

function encrypt_string(string) {
  var cipher = crypto.createCipher("aes-256-cbc", ENCRYPTION_KEY);
  var crypted = cipher.update(string, "utf8", "hex");
  crypted += cipher.final("hex");
  return int_encoder.encode(crypted, 16);
}

function decrypt_string(string) {
  key = int_encoder.decode(string, 16);
  var decipher = crypto.createDecipher("aes-256-cbc", ENCRYPTION_KEY);
  var dec = decipher.update(key, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

function random(max) {
  return Math.floor(Math.random() * max + 1);
}

function getTokenWithUid(uid) {
  const token = uid + ":" + random(100);
  // console.log("Generated token:" + token);
  const encrypted_token = encrypt_string(token);
  console.log("uid:" + uid + "  ->  Token:" + encrypted_token);
  return encrypted_token;
}

function getUidFromToken(token) {
  const user_random = decrypt_string(token);
  // console.log("user_random_t: " + user_random);
  const uid = user_random.split(":")[0];
  console.log("Token:" + token + "  ->  uid:" + uid);
  return uid;
}

function getAuthCodeWithUid(uid) {
  const authcode = uid + "." + random(100);
  //console.log("Generated authocode:" + authcode);
  const encrypted_authcode = encrypt_string(authcode);
  //console.log("uid:" + uid + "  ->  Code:" + encrypted_authcode);
  return encrypted_authcode;
}

function getUidFromAuthCode(authcode) {
  const user_random = decrypt_string(authcode);
  //console.log("user_random_c: " + user_random);
  const uid = user_random.split(".")[0];
  //console.log("Code:" + authcode + "  ->  uid:" + uid);
  return uid;
}

const app = express()
var morgan     = require('morgan');
const res = require('express/lib/response');

var port     = process.env.PORT || 5000;

//Connect with DB
mongoose.connect('mongodb+srv://swapnilifttt:Swapnil1234IFTTT@cluster0.fxohi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
  autoIndex: true
})

/**
 * MQTT STUFFS
 */

// Initialize MQTT Client
const mqtt = require('mqtt'); 
const { URLSearchParams } = require('url');
//the client id is used by the MQTT broker to keep track of clients and and their // state
const clientId = 'mqttjs_' + Math.random().toString(8).substr(2, 4) 
var options = {
    host: '236823d0c3344239b9986f357a2be29c.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'mqttpoc',
    password: 'SwapnilMQTT123'
}

//initialize the MQTT client
var client = mqtt.connect(options);

//setup the callbacks
client.on('connect', function () {
    console.log('Connected');
});

client.on('error', function (error) {
    console.log(error);
});

// configure app
app.use(morgan('dev'));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/login', (req, res) => {
	const { state, redirect_uri } = req.query;
  const redirect_url = decodeURIComponent(redirect_uri);
  res.render('login', { state, redirect_url });
})

app.get('/', (req, res) => {
    res.send('&#128516 Welcome to our Swapnil\'s POC product service API &#128516');
})

// app.get('/login', (req, res) => {
// 	//localStorage.setItem('state', req.query.state);
// 	res.sendFile('index.html', {root: __dirname});
//   //res.render('index.ejs')
// })

app.get('/signup', (req, res) => {
  res.sendFile('signup.html', {root: __dirname});
})

app.get('/authorization', (req, res) => {
	//console.log(localStorage.getItem('state'));
	res.sendFile('authorization.html', {root: __dirname});
})

app.get('/oauth2/authorize', (req, res) => {
    const state = req.query.state;
    const redirect_uri = decodeURIComponent(req.query.redirect_uri);
    console.log(" and " + state);
    // const query = querystring.stringify({
    //     "code": "alphabetathetaa"
    //     "state": state
    // });
    //console.log("----------" + redirect_uri+ '/?' + query);
    //res.redirect('https://ifttt.com/connections/XazqC6s5-checks'+ '?' + 'error=access_denied');
    res.redirect(redirect_uri + '?code=asdadasdsadz2211&state=' + state);
    //res.redirect('/');
})

app.post('/oauth2/token', (req, res) => {
  var receivedauthcode = req.body.code;
  var userid = getUidFromAuthCode(receivedauthcode); 
  var tokengen = getTokenWithUid(userid);
  console.log("Token Gen : "+ tokengen);
  res.send({
      "token_type": "Bearer",
      "access_token": tokengen
    });
})

app.get('/ifttt/v1/user/info', async (req,res) => {
  const uid = getUidFromToken(req.header("Authorization").split(" ")[1]);
  console.log('User Id is ' + uid);
  const user = await User.findOne({ _id:uid }).lean();
    res.send({
        "data": {
          "name": user.username,
          "id": user._id
        }
      })
})

app.post('/verify', async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body

	if (!username || typeof username !== 'string') {
		return res.json({ status: 'error', error: 'Invalid username' })
	}

	if (!password || typeof password !== 'string') {
		return res.json({ status: 'error', error: 'Invalid password' })
	}

	if (password.length < 5) {
		return res.json({
			status: 'error',
			error: 'Password too small. Should be atleast 6 characters'
		})
	}

	//const password = await bcrypt.hash(plainTextPassword, 10)

	try {
		const response = await User.create({
			username,
			password
		})
		console.log('User created successfully: ', response)
	} catch (error) {
		if (error.code === 11000) {
			// duplicate key
			return res.json({ status: 'error', error: 'Username already in use' })
		}
		throw error
	}

	res.json({ status: 'ok' })
  
})

app.post('/verifycredentials', async (req, res) => {
	const { username, password } = req.body
	const user = await User.findOne({ username, password }).lean()
	
	if (!user) {
		return res.json({ status: 'error', error: 'Invalid username/password' })
	}
	const authcodegen = getAuthCodeWithUid(user._id);
	const retrieveduid = getUidFromAuthCode (authcodegen);
  const accesstoken = getTokenWithUid(user._id);
	console.log("User Id : " + user._id + " Authcode : " + authcodegen + " returned uid : " + retrieveduid + " access Token : " + accesstoken);

	console.log(user);
	return res.json({ status: 'ok', data: user.username })

})

app.post('/verifydeviceuser', async (req, res) => {
  console.log("Data from Mobile : " + req.body.username + " and " + req.body.password);
  const { username, password } = req.body
  const user = await User.findOne({ username, password }).lean()

  if (!user) {
		return res.json({ status: 'error', username: '', oauthcode: ''})
	}
	const authcodegen = getAuthCodeWithUid(user._id);
	// console.log("User Id : " + user._id + " Token : " + authcodegen + " returned uid : " + retrieveduid);

	console.log(user);
	return res.json({ status: 'ok', username: user.username, oauthcode:  authcodegen})
})

app.post('/fetchauthcode', async (req, res) => {
	console.log(req.body);
	const { username } = req.body
	const user = await User.findOne({ username }).lean();
	const authcodegen = getAuthCodeWithUid(user._id);
	console.log("AUTH CODE " + authcodegen);
	return res.json({status: 'ok', data: authcodegen});
})

// app.post('/ifttt/v1/triggers/my_trigger', (req, res) => {
//   console.log("setup - body", req.body);
  
//   const screenOrientation = data.rotation;
//   var limit = (req.body.limit !== undefined && req.body.limit !== null && req.body.limit !== '')
//       ? req.body.limit : 50; // IF limit is present, just send that much
//   var myData = [];
//   // Add extra fields
//   var k=0; 
//   for(var i=0; i< Math.min(limit, 3); i++) {
      
//       var myObj = screenOrientation[i];
//       var timestamp = Math.round(Date.now() /1000); // To get seconds
    
//       var meta = {
//           "id" : screenOrientation[i].metaId,
//           "timestamp" : timestamp
//       };
//       var created_at = new Date();
//       myObj['meta'] = meta;
//       myObj['created_at'] = created_at.toISOString();
//       myData.push(myObj);
//   }
//   // reverse to send data ordered by timestamp descending
//   res.status(200).json({ "data" : myData.reverse() });
// })

app.post('/ifttt/v1/webhooks/trigger_subscription/fired', (req, res) => {
  res.status(204).send();
})

//Routes individual to User
//For pushing data to DB
app.post('/update/userdata', async (req, res) => {
  const uname = req.body.username
  const { _id : userId, username } = await User.findOne({ username: uname }).lean();
  // const userId = user._id
  console.log('Fetched User Id ' + userId)
  //Dummy choice Number
  const choiceNumberArray = ["0", "0", "0", "0", "0"]
  const geofenceStatusArray = ["0", "0", "0", "0", "0"]

  try {
		const response = await UserData.create({
			username,
      userId,
      choicenumber : choiceNumberArray,
      geofence : geofenceStatusArray
		})
		console.log('UserData created successfully: ', response)
    return res.send({userid : response.userId})
	} catch (error) {
		if (error.code === 11000) {
			// duplicate key
			return res.json({ status: 'error', error: 'User Data Profile already created' })
		}
		throw error
	}
})

//Add users data to their databases
app.post('/changemydata', async (req, res) => {
  //TODO: Add logic to change authcode to UID.
  const userId = getUidFromAuthCode(req.body.oauthcode);
  //
  console.log("UserId : " + userId)
  const data = req.body.data
  const firstDoc = await UserData.findOneAndUpdate( { userId },
    { $push : {choicenumber: data } } ).lean();

  console.log("Data updated for :  " + firstDoc.userId + " length : " + firstDoc.choicenumber.length);

  if (firstDoc.choicenumber.length >= 5) {
    // const secondQuery = 
    await UserData.findOneAndUpdate(
      {userId} ,
      { $pop: {choicenumber: -1} } ).exec();
     
    // secondQuery.choicenumber.forEach(element => {
    //   console.log("==" + element);
    // })
  }
  
  //Hit Realtime API endpoint
  const dats = JSON.stringify({"data":[{"user_id":userId}]})
  const options = {
    headers: {
        'Content-Type': 'application/json',
        'Ifttt-Service-Key': 'uTTMHvMT_L4863-vOPPiL1skasZorVs6xhZqjzuxKOhGeB6bH8JazIhdFytGxpCX'
    }
  };
  
  axios.post('https://realtime.ifttt.com/v1/notifications', dats, options)
 .then((res) => {
   console.log("RESPONSE ==== : ", res);
 })
 .catch((err) => {
   console.log("ERROR: ====", err);
 })
  // instance.post('/notifications', dats)
  
  return res.json({status:'ok'})
})

//Modify users data -- Geofence
app.post('/updategeofencestatus', async (req, res) => {
  //TODO: Add logic to change authcode to UID.
  const userId = getUidFromAuthCode(req.body.oauthcode);
  
  console.log("UserId : " + userId)
  const data = req.body.data
  const firstDoc = await UserData.findOneAndUpdate( { userId },
    { $push : {geofence: data } } ).lean();

  console.log("Data updated for :  " + firstDoc.userId + " length : " + firstDoc.geofence.length);

  if (firstDoc.geofence.length >= 5) {
    await UserData.findOneAndUpdate(
      {userId} ,
      { $pop: {geofence: -1} } ).exec();
  }
  
  //Hit Realtime API endpoint
  const dats = JSON.stringify({"data":[{"user_id":userId}]})
  const options = {
    headers: {
        'Content-Type': 'application/json',
        'Ifttt-Service-Key': 'uTTMHvMT_L4863-vOPPiL1skasZorVs6xhZqjzuxKOhGeB6bH8JazIhdFytGxpCX'
    }
  };
  
  axios.post('https://realtime.ifttt.com/v1/notifications', dats, options)
 .then((res) => {
   console.log("RESPONSE ==== : ", res);
 })
 .catch((err) => {
   console.log("ERROR: ====", err);
 })
  
  return res.json({status:'ok'})
})

// New endpoint to send data to IFTTT polling for trigger
app.post('/ifttt/v1/triggers/my_trigger', async (req, res) => {
  var limit = (req.body.limit !== undefined && req.body.limit !== null && req.body.limit !== '')
      ? req.body.limit : 50; // IF limit is present, just send that much
  var myData = [];
  // Add extra fields
  
  var accesstoken = req.header("Authorization").split(" ")[1];
  var userId = getUidFromToken(accesstoken);
  console.log("IFTTT Trigger UID : " + userId)
  //Fetch Data from DB
  const userdata = await UserData.findOne({ userId });
  const uniqueChoiceNumber = userdata.choicenumber;
  var numbers = []
  uniqueChoiceNumber.forEach(element => {
    numbers.push(element);
  });
  console.log(numbers);
  
  for(var i=0; i< Math.min(limit, 5); i++) {
      
      var myObj = {}
      myObj['luckynumber'] = numbers[i];
      var timestamp = Math.round(Date.now() /1000); // To get seconds
    
      var meta = {
          "id" : numbers[i],
          "timestamp" : timestamp
      };
      var created_at = new Date();
      myObj['meta'] = meta;
      myObj['created_at'] = created_at.toISOString();
      myData.push(myObj);
  }
  // reverse to send data ordered by timestamp descending
  res.status(200).json({ "data" : myData.reverse() });


})

app.post('/mobiledevice/update/deviceid', async(req, res) => {
  const uid = getUidFromAuthCode(req.header("Authorization").split(" ")[1]);
  const deviceid = req.body.deviceid
  console.log('User Id is ' + uid);
  await User.findOneAndUpdate( { _id:uid }, { deviceid: deviceid } ).lean();
  return res.json({status:'ok'})
})

/**
 * Endpoint for IFTTT Action (Brightness use-case)
 */
app.post('//ifttt/v1/actions/changebrightness', async(req, res) => {
  const uid = getUidFromToken(req.header("Authorization").split(" ")[1]);
  console.log('UID : ' + uid)
  const user = await User.findOne( { _id:uid } ).lean();
  if (user != null ){
    // Math.round(Date.now() /1000)
    var deviceid = user.deviceid + "/brightness"
    const data = [{
      "id": user._id,
      "msg":"Action triggered via the API :-)"
    }];
    
    client.publish(deviceid, "Hello", {qos: 1, retain: false}, (PacketCallback, err) => { 
      if(err) { 
        console.log(err, 'MQTT publish packet') 
      }
    }) 

    return res.status(200).json({ data });
  } else {
    const data = [{
      "status": "SKIP",
      "message": "User Doesn't exist"
    }]
    return res.status(400).json({ data });
  }
})

// New endpoint to send Geofence data to IFTTT, polling for trigger
app.post('/ifttt/v1/triggers/location', async (req, res) => {
  var limit = (req.body.limit !== undefined && req.body.limit !== null && req.body.limit !== '')
      ? req.body.limit : 50; // IF limit is present, just send that much
  var myData = [];
  // Add extra fields
  
  var accesstoken = req.header("Authorization").split(" ")[1];
  var userId = getUidFromToken(accesstoken);
  console.log("IFTTT Trigger -- Location UID : " + userId)
  //Fetch Data from DB
  const userdata = await UserData.findOne({ userId });
  // ---------------- Update here -----------
  const geofence = userdata.geofence;
  var geofenceStatus = []
  geofence.forEach(element => {
    geofenceStatus.push(element);
  });
  console.log(geofenceStatus);
  
  for(var i=0; i< Math.min(limit, 5); i++) {
      
      var myObj = {}
      myObj['geofencestatus'] = geofenceStatus[i];
      var timestamp = Math.round(Date.now() /1000); // To get seconds
    
      var meta = {
          "id" : geofenceStatus[i],
          "timestamp" : timestamp
      };
      var created_at = new Date();
      myObj['meta'] = meta;
      myObj['created_at'] = created_at.toISOString();
      myData.push(myObj);
  }
  // reverse to send data ordered by timestamp descending
  res.status(200).json({ "data" : myData.reverse() });
})

// Add an endpoint to Show a Connection
app.post('/showconnection/details', async(req, res) => {
  // req = {oauthcode, }
  // Fetch User Id
  const userId = getUidFromAuthCode(req.body.oauthcode);
  //
  console.log("UserId : " + userId)

  // Send GET Request to https://connect.ifttt.com/v2/connections/
  // Sample /v2/connections/C8p3q9T6?user_id=123
  const CONNECTIONID = 'YUqhEZ6p'
  const parameters = new URLSearchParams({ user_id: userId })
  const CONNECTAPIENDPOINT = 'https://connect.ifttt.com/v2/connections/' + CONNECTIONID + '?' + parameters
  console.log("Connection API : " + CONNECTAPIENDPOINT)
  const options = {
    headers: {
        'Content-Type': 'application/json',
        'Ifttt-Service-Key': 'uTTMHvMT_L4863-vOPPiL1skasZorVs6xhZqjzuxKOhGeB6bH8JazIhdFytGxpCX'
    }
  };
  var coordData = {}
  await axios.get(CONNECTAPIENDPOINT, options)
  .then((res) => {
  //  console.log("RESPONSE ==== : ", res.data.user_connection.user_features[0].user_feature_triggers[0].user_fields[1].value)
   const data = res.data.user_connection
   // 1st Feature
   const userTriggerData = data.user_features[0].user_feature_triggers[0]
   // 1st TriggerField
   const { lat, lng, radius } = userTriggerData.user_fields[0].value
   coordData['lat'] = lat
   coordData['lng'] = lng
   coordData['radius'] = radius
  })
  .catch((err) => {
   console.log("ERROR: ====", err);
  })
  res.send(coordData)
})

// https://ifttt.com/channels/hello_world_swapnil/authorize
app.listen(port);