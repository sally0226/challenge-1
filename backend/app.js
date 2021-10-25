const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const expressSession = require('express-session');
const path = require('path');
const port = process.env.PORT || 5000;
const bodyParser = require('body-parser')
const router = require('./routes/routes');
const config = require('./config/key');
const { jwtMiddleware } = require('./lib/token');
const mongoose = require('mongoose');

require("dotenv").config();
const cookieSecret = process.env.COOKIE_SECRET;

const http = require("http");
setInterval(() => {
	http.get(`${process.env.CLIENT_URL}`);
}, 600000)

mongoose.connect(config.mongoURI,{
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true, useFindAndModify:false
})
.then(()=> console.log('MoongoDB connected'))
.catch(err => console.log(err));

if(process.env.NODE_ENV=='production'){
	app.use(cors({
		origin: process.env.CORSORIGIN,
		credentials: true,
	}));
}
else app.use(cors({
	origin: 'http://localhost:3000',
	credentials: true,
}));

app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret : cookieSecret,
    cookie: {
        httpOnly: true,
        secure: false,
    }
}))
app.use(bodyParser.json());
app.use(cookieParser());
app.use(jwtMiddleware); // jwt 해석해서 user정보 req에 넣어주는 middleware
app.use('/api',router);
app.use(function (error, req, res, next) { // error handling middleware
	// 404이외의 다른 발생가능한 error도 추후에 처리하는거 추가해줘야함 
	if (error.status == 404){
		res.status(404).send({error : "not found"});
	}
	else {
		res.status(error.status).send({error : error.message});
	}
});
if(process.env.NODE_ENV=='production') {
	let root = path.join(__dirname, '../frontend/build')
	app.use(express.static(root));
	app.get("*", (req,res) => {
		res.sendFile(path.join(__dirname+"/../frontend/build/index.html"));
	})
}

app.listen(port, () => console.log(`app listening on port ${port}!`))
