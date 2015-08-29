var when = require( "when" );
var request = require( "request" );
var _ = require( "lodash" );
var resolver = require( "postal" ).configuration.resolver;

function publishEvent( topic, ev, hook ) {
	var hasMatch = _.any( hook.events || [], function( subscription ) {
		var t = topic || ev.topic;
		return resolver.compare( subscription, t );
	} );

	if ( hook.events && hook.events.length && !hasMatch ) {
		return when.resolve( { skipped: true } );
	}

	var json = _.isString( ev ) ? JSON.parse( ev ) : ev;
	var url = hook.url;
	var headers = hook.headers;
	var method = hook.method || "POST";
	if ( hook.property ) {
		var tmp = {};
		tmp[ hook.property ] = json;
		json = tmp;
	}
	_.merge( headers, { "content-type": "application/json" } );
	var requestOptions = {
		url: url,
		method: method,
		headers: headers,
		json: json
	};
	return when.promise( function( resolve, reject ) {
		request( requestOptions, function( err, resp, body ) {
			var json;
			if ( body && body[ 0 ] === "{" ) {
				var isJson = body && body !== "" && body !== "{}";
				json = isJson ? JSON.parse( body ) : {};
				json.status = resp.statusCode;
			} else if ( body ) {
				body.status = resp.statusCode;
			}
			if ( err ) {
				reject( err );
			} else if ( resp.statusCode >= 400 ) {
				reject( json || body );
			} else {
				resolve( json || body );
			}
		} );
	} );
}

module.exports = function( hooks, events ) {
	return events.subscribe( "#", function( ev, env ) {
		hooks.getList()
			.then(
				function( list ) {
					var promises = _.map( list, publishEvent.bind( undefined, env.topic, ev ) );
					return when.settle( promises );
				},
				function( err ) {
					console.log( "Error retrieving hooks! Event will not be published.", err );
					console.log( "Unpublished event: \n", JSON.stringify( ev ) );
				}
			);
	} );
};
