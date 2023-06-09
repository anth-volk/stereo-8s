// External imports
import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Internal imports
import { storeAuthToken, storeAuthTokenExpiry, storeRefreshToken, storeRefreshTokenExpiry } from '../utilities/userAuth';
import { AuthContext } from '../contexts/AuthContext.js';

export default function Login() {

	// Context
	const { setDidLogIn, authToken } = useContext(AuthContext);

	// State variable object for controlled input
	const formObject = {
		email: '',
		password: '',
	};

	// Object for storing form errors
	const formErrorsObject = {
		email: '',
		password: '',
	};

	const [form, setForm] = useState(formObject);
	const [formErrors, setFormErrors] = useState(formErrorsObject);
	const [submissionMessage, setSubmissionMessage] = useState('');

	// Declare navigate from react-router-dom in order to use inside submit handler
	const navigate = useNavigate();

	// Create new timer Ref for use with later setTimeout
	const timerRef = useRef(null);

	// Function to validate form upon submission
	function handleValidation() {

		// Store error messages
		let errors = {};

		// Bool for whether or not form is valid
		let isValid = true;

		// Map over form keys
		Object.keys(form)
			.forEach((formElementKey) => {

				// If the element exists...
				if (form[formElementKey]) {

					switch (formElementKey) {
						// Validate email addresses against regex from https://www.w3resource.com/javascript/form/email-validation.php
						case 'email':
							if (!form[formElementKey].match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
								errors.email = 'Must input a valid email address';
								isValid = false;
							} else {
								errors.email = '';
							}
							break;
						// For everything else, as long as a value exists, ensure that no errors are listed
						default:
							errors[formElementKey] = '';
							break;
					}
				}
				// If the value is blank, add the below as an error message
				else {
					errors[formElementKey] = 'This field is required';
					isValid = false;
				}

			})

		// Set formErrors based on the errors accumulated
		setFormErrors((prev) => ({
			...prev,
			...errors
		}));

		return isValid;

	}

	// Form input handler
	function handleFormChange(event) {
		const { name, value } = event.target;
		setForm(prev => ({
			...prev,
			[name]: value
		}));
	};

	// Form submission handler
	async function handleFormSubmit(event) {
		// Prevent default web redirect
		event.preventDefault();

		// Validate form
		const isFormValid = handleValidation();

		// If the form is valid...
		if (isFormValid) {

			// Submit data to API endpoint via POST request
			const res = await fetch(process.env.REACT_APP_BACKEND_TLD + '/api/v1/user_auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CORS': 'Access-Control-Allow-Origin'
				},
				body: JSON.stringify(form)
			});

			// Convert response to JSON
			const resJSON = await res.json();

			// If signup is successful per returned JSON object...
			if (resJSON.connection_status === 'success' && resJSON.data_status === 'user_exists') {

				storeAuthToken(resJSON.auth_token);
				storeAuthTokenExpiry(resJSON.auth_token_expiry);

				storeRefreshToken(resJSON.refresh_token);
				storeRefreshTokenExpiry(resJSON.refresh_token_expiry);

				// Clear any existing timeout
				clearTimeout(timerRef.current);

				// Set a successful submission message
				setSubmissionMessage('Successfully logged in. Redirecting to your library page...');

				// Wait 3 seconds, then navigate to '/library' route and pass to app that user logged in
				timerRef.current = setTimeout(() => {
					setDidLogIn(true);
					navigate('/library');
				}, 3000);

			}
			// Otherwise, set negative submission message
			else {
				setSubmissionMessage('Unable to access account. Please try again.')
			}
		}
	}

	// Clear any existing timeouts upon re-render
	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, [])

	return (
		<div className='Login'>
			<div className='Login_container'>
				<h1 className='Login_title'>Log In</h1>
				<form className='Login_form' onSubmit={handleFormSubmit}>
					<label className='Login_label' htmlFor='email'>Email Address</label>
					<input className='Login_textInput' type='email' name='email' value={form.email} onChange={handleFormChange} placeholder='Email Address'></input>
					<p className='Login_validationText'>{formErrors.email}</p>
					<label className='Login_label' htmlFor='password'>Password</label>
					<input className='Login_textInput' type='password' name='password' value={form.password} onChange={handleFormChange} placeholder='Password'></input>
					<p className='Login_validationText'>{formErrors.password}</p>
					<button type='submit' className='Util_btnSecondary Login_submitButton'>Log In</button>
				</form>
				<Link to='/signup' style={{ marginBottom: '8px' }}>I don't have an account yet</Link>
				<p className='Login_submissionMessage'>{submissionMessage}</p>
			</div>
		</div>
	)
}