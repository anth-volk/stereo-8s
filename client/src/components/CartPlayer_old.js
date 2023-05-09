// External imports
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

// Internal imports
import {localAudio} from '../audio_files/audio.js';
import tapeHiss from '../audio_files/tape_hiss.mp3';

function convertToMS(arg) {
	return parseInt(arg * 1000);
}

function convertToSeconds(arg) {
	return arg / 1000;
}

export default function CartPlayer(props) {

	const spotifyUserAuthToken = props.authToken || null;
	const activeCart = props.activeCart || null;

	const NUMBER_OF_PROGRAMS = 4;

	const FADE_IN_TIMESTAMP_MS = 0;

	const FADE_IN_LENGTH_MS = 2000;
	const FADE_OUT_LENGTH_MS = 2000;
	const PROGRAM_SELECTOR_LENGTH_MS = 0;

	const EFFECT = 'EFFECT';
	const SPOTIFY_TRACK = 'SPOTIFY_TRACK';

	// Note that activeProgram will select 0-3; when rendered, if the actual
	// number is needed, it is imperative to add 1
	const [activeProgramNumber, setActiveProgramNumber] = useState(0);
	const [cartArray, setCartArray] = useState(null);
	const [activeTrack, setActiveTrack] = useState(null);
	const [isCartPlaying, setIsCartPlaying] = useState(false);

	const [isPaused, setIsPaused] = useState(false);
	const [isPlaybackActive, setIsPlaybackActive] = useState(false);
	const [currentTrack, setCurrentTrack] = useState(null);
	const [playbackMessage, setPlaybackMessage] = useState('');
	const [isSpotifyTrackEnded, setIsSpotifyTrackEnded] = useState(false);

	// Create a ref for the index of the current track within its array

	const activeTime = useRef(0);
	const intervalRef = useRef(null);
	const timeoutRef = useRef(null);
	const localAudioRef = useRef(null);
	const playingSpotifyTrack = useRef(false);
	const playingLocalAudio = useRef(null);

	const tapeHissRef = useRef(null);

	const spotifyPlayer = useRef(null);
	const deviceId = useRef(null);

	const effects = {
		FADE_IN: tapeHissRef.current,
		FADE_OUT: tapeHissRef.current,
		INTRA_TRACK_FADE: tapeHissRef.current,
		PROGRAM_SELECTOR: 'PROGRAM_SELECTOR'
	}

	function obtainCartTimestamp() {
		if (!activeCart || !isCartPlaying) {
			return 0;
		}
		else {
			if (activeTrack.type === SPOTIFY_TRACK) {
				getSpotifyPlayerState()
					.then( (state) => {
						return activeTrack.start_timestamp + state.position;
					});
			}
			else {
				return convertToMS(localAudioRef.current.currentTime);
			}
		}
	}

	function handlePlayPause() {
		if (activeCart) {
			setIsCartPlaying(prev => !prev);

			// If active track is a Spotify one...
			if (activeTrack.type === SPOTIFY_TRACK) {
				toggleSpotifyPlayback();
				/*
				getSpotifyPlayerState()
					.then( (state) => {
						if (state.is_playing) {
							pauseSpotifyPlayback();
						}
						else {
							// TODO: Update timing function
							startSpotifyPlayback(activeTrack.audio, 0)
						}
					})
				*/
			}
			// Otherwise, if track is local audio...
			else {
				if (activeTrack.audio.paused) {
					localAudioRef.current = activeTrack.audio;
					activeTrack.audio.play();
				}
				else {
					activeTrack.audio.pause();
				}
			}

		}
	}

	function handleProgramChange() {
		setActiveProgramNumber( (prev) => {
			console.log('prev: ', prev);

			// 1 is subtracted to ensure programs run 
			// from #0 to #3 internally
			if (prev < NUMBER_OF_PROGRAMS - 1) {
				return prev += 1;
			}
			else {
				return 0;
			}
		})

		console.log('Last program: ', activeProgramNumber);
	}

	async function startSpotifyPlayback(uri, startTime) {
		try {
			const responseRaw = await fetch('https://api.spotify.com/v1/me/player/play', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + spotifyUserAuthToken
				},
				body: JSON.stringify({
					uris: [
						"spotify:track:" + uri
					],
					position_ms: startTime
				})
			});
			if (!responseRaw.ok) {
				const responseJSON = await responseRaw.json();
				console.error('Network-related error while initiating Spotify playback: ', responseJSON);
			}
		}
		catch (err) {
			console.error('Error while initiating Spotify playback: ', err);
		}
	}

	const toggleSpotifyPlayback = useCallback( async() => {
		try {
			spotifyPlayer.current.togglePlay()
				.then(() => {
					console.log('Toggled play');
				});
		}
		catch (err) {
			console.error('Error while pausing audio: ', err);
		}
	}, [spotifyPlayer]);

	/*
	// Working API state method
	const getSpotifyPlayerState = useCallback( async() => {
		try {
			const responseRaw = await fetch('https://api.spotify.com/v1/me/player', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + spotifyUserAuthToken
				}
			});
			const responseJSON = await responseRaw.json();
			if (!responseRaw.ok) {
				console.error('Network-related error while fetching Spotify player state', responseJSON);
			}
			else {
				return responseJSON;
			}
			
		}
		catch (err) {
			console.error('Error while fetching Spotify player state:', err);
		}
	}, [spotifyUserAuthToken]);
	*/

	// Most recent SDK state fetch
	const getSpotifyPlayerState = useCallback( async() => {
		try {
			const state = await spotifyPlayer.current.getCurrentState();
			if (!state) {
				console.error('Error while obtaining Spotify player state: music not currently playing through SDK');
				return;
			}
			else {
				console.log('State from fetch function: ', state);
				return state;
			}
		}
		catch (err) {
			console.error('Error while obtaining Spotify player state: ', err);
		}
	}, [])

	/*
	const getSpotifyPlayerState = useCallback( async() => {
		try {
			spotifyPlayer.current.getCurrentState()
				.then( (state) => {
					if (!state) {
						console.error('Error while obtaining Spotify player state: music not currently playing through SDK');
						return;
					}
					else {
						return state;
					}
				});
		}
		catch (err) {
			console.error('Error while obtaining Spotify player state: ', err);
		}
	}, [])
	*/

	/*
	async function getSpotifyPlayerState() {
		try {
			const responseRaw = await fetch('https://api.spotify.com/v1/me/player', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + spotifyUserAuthToken
				}
			});
			const responseJSON = await responseRaw.json();
			if (!responseRaw.ok) {
				console.error('Network-related error while fetching Spotify player state', responseJSON);
			}
			else {
				return responseJSON;
			}
			
		}
		catch (err) {
			console.error('Error while fetching Spotify player state:', err);
		}
	}
	*/

	// Spotify SDK hook
	useEffect(() => {

		const script = document.createElement("script");
		script.src = "https://sdk.scdn.co/spotify-player.js";
		script.async = true;
		
		document.body.appendChild(script);
		
		window.onSpotifyWebPlaybackSDKReady = () => {
		
			const playerConstructor = new window.Spotify.Player({
				name: 'Web Playback SDK',
				getOAuthToken: cb => { cb(spotifyUserAuthToken); },
				volume: 0.5
			});
	
			spotifyPlayer.current = playerConstructor;
			// setPlayer(player);
	
			spotifyPlayer.current.addListener('ready', ({ device_id }) => {
				console.log('Ready with Device ID', device_id);
				deviceId.current = device_id;
				// setDeviceId(device_id);
			});
		
			spotifyPlayer.current.addListener('not_ready', ({ device_id }) => {
				console.log('Device ID has gone offline', device_id);
			});
		
			spotifyPlayer.current.addListener('player_state_changed', ( state => {
	
				if (!state) {
					return;
				}
	
				setCurrentTrack(state.track_window.current_track);
				setIsPaused(state.paused);
	
				spotifyPlayer.current.getCurrentState().then( state => { 
					(!state)? setIsPlaybackActive(false) : setIsPlaybackActive(true) 
				});
	
			}));

			// Listener for track end, taken from comment at 
			// https://github.com/spotify/web-playback-sdk/issues/35
			spotifyPlayer.current.addListener('player_state_changed', (state) => {

				if (
					state
					&& state.track_window.previous_tracks.find(x => x.id === state.track_window.current_track.id)
					&& state.paused
				) {
					console.log('Track ended');
					setIsSpotifyTrackEnded(true);

				}

			});
	
			spotifyPlayer.current.on('playback_error', ({message}) => {
				console.error('Failed to perform playback', message);
			})
	
			spotifyPlayer.current.connect();
		
		};
	
	}, [spotifyUserAuthToken]);

	// Function to transfer playback to local context
	useEffect(() => {

		async function transferPlayback() {

			setPlaybackMessage('Loading Spotify player...');

			try {
				const fetchResponseRaw = await fetch('https://api.spotify.com/v1/me/player', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer ' + spotifyUserAuthToken
					},
					body: JSON.stringify({
						device_ids: [
							deviceId.current
						],
						play: false
					})
				});
				if (!fetchResponseRaw.ok) {
					const fetchResponseJSON = await fetchResponseRaw.json();
					if (fetchResponseJSON && fetchResponseJSON.error && fetchResponseJSON.error.status) {
						console.log(fetchResponseJSON);
						switch(fetchResponseJSON.error.status) {
							case 502:
								setPlaybackMessage('Error while loading Spotify player; please try again later');
								break;
							case 429:
								setPlaybackMessage('App has exceeded Spotify API limits; please try again in 30+ seconds');
								break;
							default:
								setPlaybackMessage('');
								break;
						}
					}
				}
				else {
					setPlaybackMessage('');
				}
			}
			catch (err) {
				console.error('Error while transferring Spotify playback: ', err);
				setPlaybackMessage('Error while loading Spotify player; please try again later');
			}

		}

		if (deviceId.current && activeCart && !isPlaybackActive) {
			transferPlayback();
		}

	}, [deviceId, activeCart, isPlaybackActive]);

	// Effect hook to construct a cart object representation
	// when user selects a cart
	useEffect(() => {

		if (!activeCart) {
			return;
		}

		activeTime.current = 0;

		let cartArray = [];
		let startTimestamp = FADE_IN_TIMESTAMP_MS;

		for (let i = 0; i < NUMBER_OF_PROGRAMS; i++) {
			// Set programNumber
			const programNumber = 'program'.concat(i + 1);

			// Create array for program
			let programArray = [];

			// First, add the fade-in time
			programArray = [
				...programArray,
				{
					audio: effects.FADE_IN,
					type: EFFECT,
					length: FADE_IN_LENGTH_MS,
					start_timestamp: FADE_IN_TIMESTAMP_MS,
					end_timestamp: FADE_IN_LENGTH_MS,
				}
			];

			startTimestamp = FADE_IN_LENGTH_MS + 1;

			// Then, add each cart, followed by intra-track fade (if necessary)
			for (let j = 0; j < activeCart[programNumber].tracks.length; j++) {
				const track = activeCart[programNumber].tracks[j];
				const intraTrackFadeLength = parseInt(activeCart[programNumber].intra_track_fade_length_ms);

				programArray = [
					...programArray,
					{
						audio: track.spotify_track_id,
						type: SPOTIFY_TRACK,
						length: track.duration_ms,
						start_timestamp: startTimestamp,
						end_timestamp: startTimestamp + parseInt(track.duration_ms)
					}
				];

				startTimestamp = startTimestamp + parseInt(track.duration_ms) + 1;

				// If program has intra-track fade length and we haven't reached last track
				// (no intra-track fade after the last track)...

				// Note the odd math: this appears to be due to the fact that the first second
				// of fade is actually second #0
				if (intraTrackFadeLength && j < (activeCart[programNumber].tracks.length - 1)) {
					programArray = [
						...programArray,
						{
							audio: effects.INTRA_TRACK_FADE,
							type: EFFECT,
							length: intraTrackFadeLength - 1,
							start_timestamp: startTimestamp,
							end_timestamp: startTimestamp + intraTrackFadeLength - 1
						}
					];

					startTimestamp = startTimestamp + intraTrackFadeLength;

				}
			}

			// Then, add fade-out
			programArray = [
				...programArray,
				{
					audio: effects.FADE_OUT,
					type: EFFECT,
					length: FADE_OUT_LENGTH_MS,
					start_timestamp: startTimestamp,
					end_timestamp: startTimestamp + FADE_OUT_LENGTH_MS,
				}
			];

			startTimestamp = startTimestamp + FADE_OUT_LENGTH_MS + 1;

			// Finally, add program selector arm
			programArray = [
				...programArray,
				{
					audio: effects.PROGRAM_SELECTOR,
					type: EFFECT,
					length: PROGRAM_SELECTOR_LENGTH_MS,
					start_timestamp: startTimestamp,
					end_timestamp: startTimestamp + PROGRAM_SELECTOR_LENGTH_MS,
				}
			];

			// Finally, concat finished programArray to cartArray
			cartArray = [
				...cartArray,
				programArray
			];
		};

		// Set this array as state
		setCartArray(cartArray);

		// Set first item on current program as activeTrack
		setActiveTrack(cartArray[activeProgramNumber][0]);

	}, [activeCart, activeProgramNumber, effects.FADE_IN, effects.INTRA_TRACK_FADE, effects.FADE_OUT, effects.PROGRAM_SELECTOR]);

	// TESTING
	useEffect(() => {
		console.log('cartArray:', cartArray);
	}, [cartArray])

	// Effect hook to calculate active time
	useEffect(() => {

		if (!cartArray || !isCartPlaying) {
			return;
		}

		// Clear any existing interval
		clearInterval(intervalRef.current);

		// Every ms, check to see if active track
		// has reached its end
		intervalRef.current = setInterval(() => {	

			if (activeTime.current === activeTrack.end_timestamp) {
				// Find index of activeTrack in cartArray
				const index = cartArray[activeProgramNumber].indexOf(activeTrack);

				// Set activeTrack to be next object
				setActiveTrack(cartArray[activeProgramNumber][index + 1]);
			}

			activeTime.current += 1;

			console.log('activeTime.current: ', activeTime.current);
			console.log('Last activeTrack: ', activeTrack);
			console.log('lAR: ', localAudioRef.current);

		}, 1)

		return () => clearInterval(intervalRef.current);


	}, [cartArray, isCartPlaying, activeTrack, activeProgramNumber]);

	// Effect hook for when active program number is changed
	useEffect(() => {

		console.log('activeTrack in program hook:', activeTrack);

		if (!cartArray || !activeCart || !activeTrack || !isCartPlaying || isSpotifyTrackEnded) {
			return;
		}

		// Store current active track to local variable
		const oldActiveTrack = activeTrack;

		console.log('oAT: ', oldActiveTrack);

		// If current active track is Spotify...
		if (oldActiveTrack.type === SPOTIFY_TRACK) {

			getSpotifyPlayerState()
				.then( (state) => {

					console.log('state:', state);

					// Calculate overall cart timestamp
					const cartTimestamp = oldActiveTrack.start_timestamp + state.position;
					console.log('activeTime in program hook: ', cartTimestamp);

					// Set current time as cartTimestamp
					activeTime.current = cartTimestamp;
					
					const newActiveTrack = cartArray[activeProgramNumber]
						.find( (track) => {
							return (
								track.start_timestamp <= activeTime.current + 1 &&
								track.end_timestamp >= activeTime.current + 1
							)
						});
		
				setActiveTrack(newActiveTrack);

				});
			}
		// Otherwise, if it's a local sound...
		else {
			// TESTING
			console.log(oldActiveTrack.audio);

			console.log('lAR current time: ', oldActiveTrack.audio.currentTime);

			// This number is converted from seconds to ms
			const stopTime = convertToMS(oldActiveTrack.audio.currentTime);
			console.log('stopTime: ', stopTime);

			// Pause and reset old active track
			localAudioRef.current.pause();
			// localAudioRef.current.currentTime = 0;

			// Fetch currentTime and calculate overall cart timestamp
			const cartTimestamp = oldActiveTrack.start_timestamp + stopTime;

			// Set current time as cartTimestamp (write separate method?)
			activeTime.current = cartTimestamp;
			console.log('activeTime.current: ', activeTime.current);

			// Set new active track akin to above
			const newActiveTrack = cartArray[activeProgramNumber]
				.find( (track) => {
					return (
						track.start_timestamp <= activeTime.current + 1 &&
						track.end_timestamp >= activeTime.current + 1
					)
				});

			setActiveTrack(newActiveTrack);
		}

	}, [activeProgramNumber, activeCart, cartArray, activeTrack, getSpotifyPlayerState])

	/*
	// Effect hook for when active program number is changed
	useEffect(() => {
		// Iterate through cartArray at new active program number
		// and determine which track correctly fits activeTime
		if (!activeCart || !cartArray) {
			return;
		}

		const newActiveTrack = cartArray[activeProgramNumber]
			.find( (track) => {
				return (
					track.start_timestamp <= activeTime.current &&
					track.end_timestamp >= activeTime.current
				)
			});

		setActiveTrack(newActiveTrack);

	}, [activeProgramNumber, cartArray, activeCart]);
	*/

	// The below segment is buggy
	// Effect hook for dealing with Spotify track end
	useEffect(() => {
		if (activeCart && activeTrack && activeTrack.type === SPOTIFY_TRACK && isSpotifyTrackEnded) {

			// Find index of activeTrack in cartArray
			const index = cartArray[activeProgramNumber].indexOf(activeTrack);

			// Set active track to be next item
			setActiveTrack(cartArray[activeProgramNumber][index + 1]);
			setIsSpotifyTrackEnded(false);
		}
	}, [isSpotifyTrackEnded, activeCart, activeTrack, activeProgramNumber, cartArray]);

	// Effect hook for when activeTrack itself changes
	useEffect(() => {

		console.log('activeTrack change hook triggered');

		if (!activeTrack || !isCartPlaying) {
			console.log('Returning from aT hook');
			return;
		}

		if (activeTrack.type === EFFECT) {

			/*
			// Pause and 'rewind' any existing local audio
			localAudioRef.current.pause();
			localAudioRef.current.currentTime = 0;
			*/

			console.log('aT effect-type routine');

			// Pause any existing Spotify audio
			spotifyPlayer.current.pause();

			// Set some sort of length for track to play

			/*
			// Play effect audio
			localAudioRef.current.currentTime = 0;
			localAudioRef.current.play();
			*/

			// Determine track start time
			const startTime = convertToSeconds(activeTime.current - activeTrack.start_timestamp);

			// Play effect audio
			activeTrack.audio.currentTime = startTime;
			activeTrack.audio.play();

			// Set effect audio as localAudioRef
			localAudioRef.current = activeTrack.audio;
			console.log('lAR: ', localAudioRef.current);
		}
		else {

			// Pause and 'rewind' any local audio
			localAudioRef.current.pause();
			localAudioRef.current.currentTime = 0;

			const uri = activeTrack.audio;
			const startTime = activeTime.current - activeTrack.start_timestamp;
			console.log('activeTime in track change hook: ', activeTime.current);
			console.log('sT: ', startTime);

			// playingLocalAudio.current.pause();

			startSpotifyPlayback(uri, startTime);

			playingSpotifyTrack.current = true;
		}

	}, [activeTrack])

	return (
		<Fragment>
			<div className='container'>
				<div className='audioFiles'>
					<audio src={tapeHiss} ref={tapeHissRef} />
				</div>
				<div className='main-wrapper'>
					{/*Empty 8-track player visual*/}
					{/*Inside of that: activeCart details, if present*/}
					{ activeCart && <p className='activeCart_details'>{activeCart.cart_name}</p>}
					<p className='playbackMessage'>{playbackMessage}</p>	
				</div>
				<button type='button' className={`playbackButton ${activeCart && isPlaybackActive && !playbackMessage ? 'active' : 'disabled'}`} onClick={handlePlayPause}>
					{ isCartPlaying ? 'PAUSE' : 'PLAY'}
				</button>
				<button type='button' className='playbackButton' onClick={handleProgramChange}>PROGRAM</button>
			</div>
		</Fragment>
	)

}