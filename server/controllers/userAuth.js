// External package imports
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ORM import
const { Sequelize } = require('sequelize');

// ORM configuration
const sequelize = new Sequelize(
	process.env.DB_NAME_DEV,
	process.env.DB_USERNAME,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: 'postgres'
	}
);

// bcrypt configuration
const SALT_ROUNDS = 10;

const User = require('../models/User')(sequelize);

/**
 * Function for creating password hashes using bcrypt
 * @param {string} password 
 * @returns {string} Returns a hashed password 
*/
async function hashPassword(password) {

	try {

		const salt = await bcrypt.genSalt(SALT_ROUNDS);
		const hash = await bcrypt.hash(password, salt);
		return hash;

	} catch (err) {
		throw new Error('Error while hashing password: ', err);
	}
	
}

// Based on tutorial at https://buddy.works/tutorials/securing-node-and-express-restful-api-with-json-web-token#updating-todo-api-folder-structure
/**
 * Middleware for verifying JSON web tokens
 */
function verifyJWT(req, res, next) {

	try {

		if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {

			const decodedData = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);

			req.user = decodedData;
		}

		next();

	} catch (err) {

		console.error('Error while authenticating JWT: ', err);
		req.user = undefined;
		res.status(401).json({
			message: 'User not found or token is expired'
		});

	}
}

/**
 * Function for creating user by adding them to underlying SQL database (via Sequelize)
 * @param {Object} req The HTTP request body
 * @returns {Object} Returns an object with data about the success or failure of the user creation
 */
async function createUser(req) {

	try {
		const passwordHash = await hashPassword(req.body.password);

		const newUser = await User.create({
			user_id: crypto.randomUUID(),
			email: req.body.email,
			password_hash: passwordHash,
			first_name: req.body.fname,
			last_name: req.body.lname
		});

		return ({
			status: 'success'
		});


	} catch (err) {
		console.error(`Error while trying to create new user: ${err}`);
		return ({
			status: 'failure',
			error: err
		});

	}

}

/**
 * Function for verifying a user's account
 * @param {Object} req The HTTP request body
 * @returns {(JsonWebKey|null)} Returns either a JSON web token, or null if the user could not be found
 */
async function verifyUser(req) {

	const submittedEmail = req.body.email;
	const submittedPassword = req.body.password;
	let userId = null;

	try {

		const userQuery = await User.findOne({
			where: {
				email: submittedEmail
			}
		});

		if (userQuery) {

			const isPasswordMatching = await bcrypt.compare(submittedPassword, userQuery.dataValues.password_hash);

			if (userQuery.dataValues.email === submittedEmail && isPasswordMatching) {
				
				const userObject = {
					userId: userQuery.dataValues.user_id
				}

				return jwt.sign(
					userObject, 
					process.env.JWT_SECRET,
					{
						expiresIn: 60 * 60 * 24 * 14
					});

			}

		} 

		return null;
		
	} catch (err) {

		throw new Error(`Error while verifying user: ${err}`);

	} 

}

async function verifyUserSpotifyData(userData) {

	// Pull user ID from passed data
	const { userId } = userData;

	// Query DB for Spotify user data
	try {
		const userSpotifyQuery = await User.findOne({
			where: {
				user_id: userId
			}
		});

		if (userSpotifyQuery) {

			const returnedData = userSpotifyQuery.dataValues;

			return ({
				user_id: returnedData.user_id,
				spotify_access_token: returnedData.spotify_access_token,
				spotify_access_token_updatedAt: returnedData.spotify_access_token_updatedAt,
				spotify_access_token_age: returnedData.spotify_access_token_age,
				spotify_refresh_token: returnedData.spotify_refresh_token
			});
		} 
		
		return null;

	}
	catch (err) {
		console.error('Error while querying database for user Spotify data: ', err);
	}


}

module.exports = {
	createUser,
	verifyJWT,
	verifyUser,
	verifyUserSpotifyData
}