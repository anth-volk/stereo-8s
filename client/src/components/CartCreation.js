// External imports
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useCookies } from 'react-cookie';

// Internal imports
import { finalizeTracks, parseAlbumAndPullTracks } from '../utilities/cartCreation.js';
import { AuthContext } from '../contexts/AuthContext.js';

export default function CartCreation(props) {

	const [albumSearchParam, setAlbumSearchParam] = useState('');
	const [albumResultObject, setAlbumResultObject] = useState(null);
	const [clickedAlbum, setClickedAlbum] = useState(null);
	const [programmedAlbum, setProgrammedAlbum] = useState(null);
	const [cartridgeCreationMessage, setCartridgeCreationMessage] = useState('');

	const [cookies, setCookie, removeCookie] = useCookies();

	const { setDidLogIn, authToken } = useContext(AuthContext);
	const spotifyToken = props.spotifyToken;

	const timerRef = useRef(null);

	function resetStateExceptCreationMessage() {
		setAlbumSearchParam('');
		setAlbumResultObject(null);
		setClickedAlbum(null);
		setProgrammedAlbum(null);
	}

	function handleSearchValueUpdate(event) {
		setAlbumSearchParam(event.target.value);
	}

	async function handleSearchSubmission() {

		const responseObjectRaw = await fetch(process.env.REACT_APP_BACKEND_TLD + '/api/v1/spotify_api/search_album?album=' + albumSearchParam, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'CORS': 'Access-Control-Allow-Origin',
				'Authorization': 'Bearer ' + spotifyToken.access_token
			}
		});

		const responseObjectJSON = await responseObjectRaw.json();

		setAlbumResultObject(responseObjectJSON.result_object.albums.items);

	}

	async function handleAlbumClick(index) {

		const responseObjectRaw = await fetch(process.env.REACT_APP_BACKEND_TLD + '/api/v1/spotify_api/get_album?album_id=' + albumResultObject[index].id, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'CORS': 'Access-Control-Allow-Origin',
				'Authorization': 'Bearer ' + spotifyToken.access_token
			}
		});

		const responseObjectJSON = await responseObjectRaw.json();

		setClickedAlbum(responseObjectJSON.result_object);
	}

	async function handleCartCreation() {

		const ERROR_MESSAGE = 'There was an error while trying to create your cartridge. Please try again.';
		const SUCCESS_MESSAGE = 'Your cartridge was successfully added to your library!';

		const responseObjectRaw = await fetch(process.env.REACT_APP_BACKEND_TLD + '/api/v1/protected/library/create_cart', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'CORS': 'Access-Control-Allow-Origin',
				'Authorization': 'JWT ' + authToken
			},
			body: JSON.stringify(programmedAlbum)
		});

		const responseObjectJSON = await responseObjectRaw.json();

		if (responseObjectJSON.connection_status === 'success' && responseObjectJSON.created_cartridge) {
			setCartridgeCreationMessage(SUCCESS_MESSAGE);
			resetStateExceptCreationMessage();

		}
		else {
			setCartridgeCreationMessage(ERROR_MESSAGE);
		}

		// Clear any existing timeout
		clearTimeout(timerRef.current);

		// Wait 3 seconds, then reset cartridge creation message
		timerRef.current = setTimeout(() => {
			setCartridgeCreationMessage('');
		}, 2000);

	}

	useEffect(() => {
		if (clickedAlbum) {
			const albumTracksArray = parseAlbumAndPullTracks(clickedAlbum);
			const albumTracksDistributed = finalizeTracks(albumTracksArray);

			const albumArtists = clickedAlbum.artists.map((artist) => {
				return artist.name;
			});

			const finalizedAlbum = {
				name: clickedAlbum.name,
				artists: albumArtists,
				programs: albumTracksDistributed
			};
			setProgrammedAlbum(finalizedAlbum);
		}

	}, [clickedAlbum]);

	// Clear any existing timeouts upon re-render
	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, [])

	return (
		<Fragment>
			<h1>Create New Cartridge</h1>
			<grid>
				<div className='CartCreation_left'>
					<h2>Search for an album below:</h2>
					{/*Display little search icon*/}
					<input type='text' value={albumSearchParam} name='albumSearchParam' placeholder='Find an album' onChange={handleSearchValueUpdate}></input>
					<button type='button' onClick={handleSearchSubmission}>Search</button>
					<div className='CartSearch_grid'>
						{albumResultObject && Object.keys(albumResultObject).map((key, index) => {
							return (
								<div className='spotifyResultCard' key={index} onClick={(e) => { handleAlbumClick(index) }}>
									<img src={albumResultObject[index].images[0].url}></img>
									<p>{albumResultObject[index].artists[0].name} </p>
									<p>{albumResultObject[index].name}</p>
								</div>
							)
						})}
					</div>
				</div>
				<div className='CartCreation_right'>
					<h2>Cartridge Preview</h2>
					<div className='CartPreview_container'>
						{clickedAlbum &&
							<Fragment>
								<img className='CartPreview_image' src={clickedAlbum.images[0].url}></img>
								<p>{clickedAlbum.artists[0].name.toUpperCase()}</p>
								<p>{clickedAlbum.name}</p>
							</Fragment>
						}
					</div>
					{clickedAlbum && !programmedAlbum &&
						<p>Loading...</p>
					}
					{programmedAlbum &&
						<button type='button' onClick={handleCartCreation}>Create New Cartridge</button>
					}
					<p>{cartridgeCreationMessage}</p>
				</div>
			</grid>
		</Fragment>
	)
}