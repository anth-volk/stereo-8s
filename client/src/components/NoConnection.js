export default function NoConnection() {

	const BACKEND_URL = process.env.REACT_APP_BACKEND_TLD;

	return (
		<section className="CartLibraryNoConnection">
			<h1 className="CLNC_header">One last step...</h1>
			<p className="CLNC_text">In order to proceed, please connect to your Spotify Premium&reg; account:</p>
			<a href={BACKEND_URL + '/api/v1/spotify_auth'} className="Util_linkBtnSecondary">Connect to Spotify Premium</a>
		</section>
	)

}