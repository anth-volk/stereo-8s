// External imports
import { useCallback, useEffect, useRef, useState } from 'react';

// Internal imports
import { finalizeTracks, parseAlbumAndPullTracks } from '../utilities/cartCreation.js';
import { jwtApiCall } from '../utilities/userAuth.js';

export default function CartCreation(props) {

	const [albumSearchParam, setAlbumSearchParam] = useState('');
	const [albumResultObject, setAlbumResultObject] = useState(null);
	const [clickedAlbum, setClickedAlbum] = useState(null);
	const [programmedAlbum, setProgrammedAlbum] = useState(null);
	const [programView, setProgramView] = useState(null);
	const [cartridgeCreationMessage, setCartridgeCreationMessage] = useState('');

	const spotifyToken = props.spotifyToken;

	const timerRef = useRef(null);
	const searchSubmissionRef = useRef(null);
	const cartCreationRef = useRef(null);
	const searchBoxRef = useRef(null);

	function resetStateExceptCreationMessage() {
		setAlbumSearchParam('');
		setAlbumResultObject(null);
		setClickedAlbum(null);
		setProgrammedAlbum(null);
	}

	function handleSearchValueUpdate(event) {
		setAlbumSearchParam(event.target.value);
	}

	const handleSearchSubmission = useCallback(async () => {

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

	}, [albumSearchParam, spotifyToken])

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

		const responseObjectJSON = await jwtApiCall('/library/create_cart', 'POST', JSON.stringify(programmedAlbum));

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
		}, 3000);

	}

	// Enter key event listener
	useEffect(() => {

		async function handleEnterKey(event) {
			if (event.key === 'Enter') {
				await handleSearchSubmission();
			}
		}

		document.addEventListener('keydown', handleEnterKey);

		return () => {
			document.removeEventListener('keydown', handleEnterKey);
		}
	}, [albumSearchParam, handleSearchSubmission])

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

			let programElems = finalizedAlbum.programs.map((program) => {
				return (
					<div className='programContainer' key={program.program_number}>
						<p className='programContainer_number'>{program.program_number}</p>
						<div className='programContainer_trackContainer'>
							{program.tracks.map((track) => {
								return (
									<p className='programContainer_track' key={track.id}>{track.name}</p>
								)
							})}
						</div>
					</div>
				)
			});

			setProgramView(programElems);
			setProgrammedAlbum(finalizedAlbum);
		}

	}, [clickedAlbum]);

	// Clear any existing timeouts upon re-render
	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, [])

	return (
		<section className="CartCreation">
			<h1 className="Util_invertedText">Create New Cartridge</h1>
			<div className="CartCreation_grid">
				<div className='CartCreation_side CartCreation_left'>
					<h2 className="CartCreation_sideHeader">Search for an album below:</h2>
					<div className="CartCreation_searchContainer">
						<input type='text' className="CartCreation_searchInput" ref={searchBoxRef} value={albumSearchParam} name='albumSearchParam' placeholder='Find an album' onChange={handleSearchValueUpdate}></input>
						<button type='button' className="Util_btnSecondary Util_btnThin" ref={searchSubmissionRef} onClick={handleSearchSubmission}>Search</button>
					</div>
					<div className='CartSearch_grid'>
						{albumResultObject && Object.keys(albumResultObject).map((key, index) => {
							return (
								<div className='CartSearch_spotifyResultCard' key={index} onClick={(e) => { handleAlbumClick(index) }}>
									<img className='spotifyResultCard_image' src={albumResultObject[index].images[0].url} alt={`Album cover of ${albumResultObject[index].name}`}></img>
									<p className='spotifyResultCard_artist'>{albumResultObject[index].artists[0].name} </p>
									<p className='spotifyResultCard_name'>{albumResultObject[index].name}</p>
								</div>
							)
						})}
					</div>
				</div>
				<div className='CartCreation_side CartCreation_right'>
					<h2 className="CartCreation_sideHeader">Cartridge Preview</h2>
					<div className='CartPreview_container'>
						{clickedAlbum &&
							<div className='CartPreview_plastic'>
								<div className='CartPreview_label'>
									<div className='CartPreview_label_imageContainer'>
										<img className='CartPreview_image' src={clickedAlbum.images[0].url} alt={`Album cover of ${clickedAlbum.name}`}></img>
									</div>
									<p className='CartPreview_label_title'>{clickedAlbum.artists[0].name.toUpperCase()}</p>
									<p className='CartPreview_label_name'>{clickedAlbum.name}</p>
									<div className='CartPreview_label_programs'>
										{programView}
									</div>
								</div>
							</div>
						}
					</div>
					{clickedAlbum && !programmedAlbum &&
						<p>Loading...</p>
					}
					{programmedAlbum &&
						<button type='button' className='Util_btnAccent Util_btnThin' ref={cartCreationRef} onClick={handleCartCreation}>Create New Cartridge</button>
					}
					<p className='Util_invertedText'>{cartridgeCreationMessage}</p>
				</div>
			</div>
		</section>
	)
}