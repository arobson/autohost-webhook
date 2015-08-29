var _ = require( "lodash" );
var hooks = require( "./db" )( "hooks.db" );

function add( id, hook ) {
	return hooks.upsert(
		{ id: id },
		hook
	);
}

function check( id ) {
	return hooks.count( { id: id } )
		.then( function( count ) {
			return count > 0 ;
		} );
}

function getById( id ) {
	return hooks.fetch( { id: id } )
		.then( function( results ) {
			return results.length ? stripPrefix( results[ 0 ] ) : undefined;
		} );
}

function getList() {
	return hooks.fetch( {} )
		.then( function( results ) {
			return _.map( results, stripPrefix );
		} );
}

function stripPrefix( item ) { // jshint ignore:line
	item.id = item.id.split( "::" )[ 1 ];
	return item;
}

function remove( id ) {
	return hooks.purge( { id: id } );
}

function update( id, hook ) {
	return hooks.upsert(
		{ id: id },
		hook
	);
}

module.exports = {
	add: add,
	checkId: check,
	getById: getById,
	getList: getList,
	remove: remove,
	update: update
};
