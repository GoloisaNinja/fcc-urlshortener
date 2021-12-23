require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { nanoid } = require('nanoid');
const bodyParser = require('body-parser');
const dns = require('dns');

// Connect to database
const mongoose = require('mongoose');
const db = process.env.MONGO_URI;
const { Schema } = mongoose;

const connectDB = async () => {
	try {
		await mongoose.connect(db, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('MongoDB connected...');
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

connectDB();

// for parsing application/json
app.use(bodyParser.json());

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true }));
//form-urlencoded

// Create the Slug Schema
const slugSchema = new Schema({
	slug: {
		type: String,
		required: true,
		unique: true,
	},
	redirect: {
		type: String,
		required: true,
	},
});

const Slug = mongoose.model('Slug', slugSchema);

// Basic Configuration
const port = process.env.PORT || 5000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
	res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
	res.json({ greeting: 'hello API url' });
});

// Take URL from form and return a slug in json format
app.post('/api/shorturl', async (req, res) => {
	// looks for just https and http site protocols
	const regex = /^https?:\/\/?/gi;
	const userLink = await req.body.url;
	// passing userlink to a new URL constructor should give me a clean hostname to use the dns.lookup on
	const { hostname } = new URL(userLink);
	// if test is false then we exit with response of error
	if (!regex.test(userLink)) {
		return res.send({ error: 'invalid url' });
	}
	dns.lookup(hostname, async (err, address, family) => {
		if (err) {
			return res.send({ error: 'invalid url' });
		} else {
			try {
				const slug = nanoid(4);
				const redirect = userLink;
				const document = new Slug({ slug, redirect });
				await document.save();
				res.send({ original_url: redirect, short_url: slug });
			} catch (error) {
				console.error(error);
				res.status(500);
			}
		}
	});
});

// Use params to redirect if record exists in db else respond no url found
app.get('/api/shorturl/:slugId', async (req, res) => {
	try {
		const slug = req.params.slugId;
		const document = await Slug.findOne({ slug });
		if (!document) {
			return res.send({ error: 'No short URL found for this input' });
		}
		res.redirect(document.redirect);
	} catch (error) {
		console.error(error);
		res.status(500);
	}
});

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
